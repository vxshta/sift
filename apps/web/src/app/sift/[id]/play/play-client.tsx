"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getSiftAction, completeSessionAction, batchUpdateEchoesAction, createSessionAction, saveSessionAnswersAction } from "../../actions";
import { generateNextModuleAction, getLearningPathForSiftAction } from "../../../learn/actions";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, ArrowRightIcon, CheckmarkCircle02Icon, Cancel01Icon, HelpCircleIcon, Loading03Icon, KeyboardIcon, Target02Icon, Time01Icon, ViewIcon, ReloadIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { SiftWithQuestions } from "@sift/auth/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, easeInOut } from "framer-motion";
import useSound from "use-sound";
import { Pie, PieChart } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

interface SiftPlayPageClientProps {
    id: string;
}

export default function SiftPlayPageClient({ id }: SiftPlayPageClientProps) {
  const router = useRouter();

  const [sift, setSift] = useState<SiftWithQuestions | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isStartingSession = useRef(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const startTime = useRef<number>(0);
  const [duration, setDuration] = useState<string>("");
  const [avgTime, setAvgTime] = useState<string>("");
  
  // Track performance locally for batch update at the end
  const [performanceData, setPerformanceData] = useState<{ topic: string, level: number }[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [learningPath, setLearningPath] = useState<any>(null);
  const [continuing, setContinuing] = useState(false);

  // Sounds
  const [playClick] = useSound('/audio/click.wav', { volume: 0.05 });
  const [playSuccess] = useSound('/audio/notification.wav', { volume: 0.05 });
  const [playNotification] = useSound('/audio/success.mp3', { volume: 0.05 });

  const pieChartConfig = {
    correct: {
        label: "Correct",
        color: "#22c55e",
    },
    incorrect: {
        label: "Incorrect",
        color: "#ef4444",
    },
  } satisfies ChartConfig;

  const { data: siftData, isLoading: isSiftLoading, refetch: refetchSift } = useQuery({
    queryKey: ["sift", id],
    queryFn: () => getSiftAction(id),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24 * 365,
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (siftData) {
        setSift(siftData);
    }
  }, [siftData]);

  useEffect(() => {
    if (isStartingSession.current || isSiftLoading) return;
    if (!siftData) {
        toast.error("Sift not found");
        router.push("/sifts");
        return;
    }
    isStartingSession.current = true;
    const start = async () => {
        try {
            const newSessionId = await createSessionAction(id);
            setSessionId(newSessionId);
            setLoading(false);
            startTime.current = Date.now();
        } catch (e) {
            console.error(e);
            toast.error("Failed to start session");
            router.push(`/sift/${id}`);
        }
    };
    start();
  }, [id, router, siftData, isSiftLoading]);

  useEffect(() => {
    getLearningPathForSiftAction(id).then(setLearningPath).catch(() => setLearningPath(null));
  }, [id]);

  // Server-Sent Events (SSE) for real-time updates
  useEffect(() => {
    if (loading || !sift || (sift.questions && sift.questions.length > 0)) return;

    const eventSource = new EventSource(`/api/sift/${id}/status`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "ready") {
          toast.success("Questions ready!");
          // Reload to fetch the full data with questions
          // We could also pass the data in the event, but reloading ensures full state consistency
          // or re-fetch via action
          refetchSift();
          eventSource.close();
        }
      } catch (e) {
        console.error("SSE Parse Error", e);
      }
    };

    eventSource.onerror = (e) => {
        console.error("SSE Error", e);
        eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id, loading, sift, refetchSift]);

  const handleOptionClick = useCallback((option: string) => {
    if (showAnswer) return; 
    playClick();
    setSelectedOption(option);
  }, [showAnswer, playClick]);

  const handleCheckAnswer = useCallback(() => {
    if (!selectedOption || !sift) return;
    
    setShowAnswer(true);
    
    // Determine correctness for sound
    const currentQ = sift.questions[currentQuestionIndex];
    let isCorrect = false;
    if (currentQ.correctOption && currentQ.options) {
        const correctIndex = currentQ.correctOption.charCodeAt(0) - 65;
        const selectedIndex = (currentQ.options as string[]).indexOf(selectedOption);
        isCorrect = correctIndex === selectedIndex;
    } else {
        isCorrect = selectedOption === currentQ.answer;
    }

    if (isCorrect) {
        playSuccess();
    } else {
        playNotification(); // Error sound placeholder
    }
  }, [selectedOption, sift, currentQuestionIndex, playSuccess, playNotification]);

  const handleNext = useCallback(async () => {
    if (!sift || !sift.source || processing) return;

    playClick();
    setProcessing(true);
    const currentQ = sift.questions[currentQuestionIndex];
    
    let isCorrect = false;
    if (currentQ.correctOption && currentQ.options) {
        const correctIndex = currentQ.correctOption.charCodeAt(0) - 65;
        const selectedIndex = (currentQ.options as string[]).indexOf(selectedOption || "");
        isCorrect = correctIndex === selectedIndex;
    } else {
        isCorrect = selectedOption === currentQ.answer;
    }

    // Update local state for accuracy
    if (isCorrect) {
        setCorrectCount(prev => prev + 1);
    }

    // Save answer
    if (sessionId) {
        saveSessionAnswersAction(sessionId, [{
            questionId: currentQ.id,
            userAnswer: selectedOption || "",
            isCorrect
        }]).catch(console.error);
    }

    const mastery = isCorrect ? 100 : 0;
    
    // Topic Extraction
    let topic = "General";
    if (currentQ.tags && currentQ.tags.length > 0) {
        topic = currentQ.tags[0];
    } else {
        topic = currentQ.question.substring(0, 50) + (currentQ.question.length > 50 ? "..." : "");
    }
    
    const newPerformanceEntry = { topic, level: mastery };
    setPerformanceData(prev => [...prev, newPerformanceEntry]);

    if (currentQuestionIndex < sift.questions.length - 1) {
       setCurrentQuestionIndex(prev => prev + 1);
       setShowAnswer(false);
       setSelectedOption(null);
       setProcessing(false);
    } else {
       // End of session
       try {
           // We calculate final count manually to ensure it includes the current question's result
           // regardless of the async state update of correctCount
           const finalCorrectCount = correctCount + (isCorrect ? 1 : 0);
           const finalScore = Math.round((finalCorrectCount / sift.questions.length) * 100);

           if (sessionId) {
               await completeSessionAction(sessionId, finalScore);
           }
           
           // Include the current question's performance data
           const mergedUpdates = [...performanceData, newPerformanceEntry];
           await batchUpdateEchoesAction(sift.sourceId, mergedUpdates);
           
           const timeTaken = Date.now() - startTime.current;
           const minutes = Math.floor(timeTaken / 60000);
           const seconds = Math.floor((timeTaken % 60000) / 1000);
           setDuration(`${minutes}m ${seconds}s`);

           const avgTimeMs = timeTaken / sift.questions.length;
           const avgMinutes = Math.floor(avgTimeMs / 60000);
           const avgSeconds = Math.floor((avgTimeMs % 60000) / 1000);
           setAvgTime(`${avgMinutes}m ${avgSeconds}s`);

           setCompleted(true);
           playSuccess();
       } catch (error) {
           console.error("Failed to complete session", error);
           toast.error("Failed to save progress");
           setProcessing(false); // Only reset if failed, otherwise we stay in "completed" state
       }
    }
  }, [sift, currentQuestionIndex, selectedOption, playClick, playSuccess, performanceData, correctCount, sessionId, processing]);

  const handleContinueLearning = useCallback(async () => {
    if (!learningPath) {
        router.push(`/sift/${id}`);
        return;
    }
    const currentSiftIndex = learningPath.sifts.findIndex((s: any) => s.siftId === id);
    const nextSift = learningPath.sifts[currentSiftIndex + 1];
    if (nextSift) {
        router.push(`/sift/${nextSift.siftId}/play`);
        return;
    }
    setContinuing(true);
    try {
        const { siftId } = await generateNextModuleAction(learningPath.id, learningPath.goal, id);
        toast.success("Module generated!");
        router.push(`/sift/${siftId}/play`);
    } catch (e) {
        toast.error("Failed to generate module");
    } finally {
        setContinuing(false);
    }
  }, [learningPath, id, router]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (loading || completed || !sift) return;
        
        const currentQ = sift.questions?.[currentQuestionIndex];
        if (!currentQ) return;
        
        const options = (currentQ?.options as string[]) || [];

        if (!showAnswer) {
            if (e.key === 'Enter' && selectedOption) {
                handleCheckAnswer();
            }
            if (options.length >= 1 && (e.key === 'a' || e.key === 'A' || e.key === '1')) handleOptionClick(options[0]);
            if (options.length >= 2 && (e.key === 'b' || e.key === 'B' || e.key === '2')) handleOptionClick(options[1]);
            if (options.length >= 3 && (e.key === 'c' || e.key === 'C' || e.key === '3')) handleOptionClick(options[2]);
            if (options.length >= 4 && (e.key === 'd' || e.key === 'D' || e.key === '4')) handleOptionClick(options[3]);
        } else {
            if (e.key === 'Enter') {
                handleNext();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, completed, sift, currentQuestionIndex, showAnswer, selectedOption, handleOptionClick, handleCheckAnswer, handleNext]);

  if (isSiftLoading || loading) {
    return (
        <div className="flex h-[90vh] items-center justify-center flex-col gap-4">
            <HugeiconsIcon icon={Loading03Icon} className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Starting session...</p>
        </div>
    );
  }

  if (!sift) return null;

  // --- SUMMARY VIEW ---
  if (completed) {
    const accuracy = Math.round((correctCount / sift.questions.length) * 100);
    const incorrectCount = sift.questions.length - correctCount;

    return (
        <div className="flex items-center justify-center min-h-[calc(100svh-4.5rem)] sm:min-h-[calc(100svh-4rem)] p-0 w-full animate-in fade-in zoom-in duration-300">
            <Card className="w-full max-w-5xl grid md:grid-cols-2 overflow-hidden border-0 ring-1 ring-border py-0 ">
                {/* Left Column: Score & Chart */}
                <div className="flex flex-col items-center justify-center p-6 md:px-12 md:py-12 space-y-8 text-center relative overflow-hidden">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="relative z-10 mb-4"
                    >
                        <div className="relative">
                            <ChartContainer config={pieChartConfig} className="aspect-square h-[240px] w-[240px]">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'correct', value: correctCount, fill: "var(--color-correct)" },
                                            { name: 'incorrect', value: incorrectCount, fill: "var(--color-incorrect)" },
                                        ]}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={80}
                                        outerRadius={110}
                                        strokeWidth={0}
                                        cornerRadius={4}
                                        paddingAngle={2}
                                    />
                                </PieChart>
                            </ChartContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-center"
                                >
                                    <span className="text-5xl font-bold tracking-tighter block">{accuracy}%</span>
                                    <span className="text-sm text-muted-foreground font-medium uppercase tracking-widest mt-1 block">Accuracy</span>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                    
                    <div className="space-y-2 relative z-10">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {accuracy >= 80 ? "Outstanding!" :
                             accuracy >= 50 ? "Good Job!" :
                             "Keep Practicing!"}
                        </h1>
                        <p className="text-muted-foreground max-w-[350px] line-clamp-2 mx-auto">
                            You've completed <span className="font-semibold text-foreground">"{sift.source?.title}"</span>
                        </p>
                    </div>
                </div>

                {/* Right Column: Stats & Actions */}
                <div className="flex flex-col p-8 pt-0 md:pt-8 md:pl-3 md:pr-8 md:py-8 space-y-6 bg-card">
                    <div className="flex-1 grid grid-cols-2 gap-4 content-center">
                        <div className="flex flex-col gap-3 p-5 rounded-2xl border bg-card/50 hover:bg-card/80 transition-colors">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-5 w-5" />
                                </div>
                                Correct
                            </div>
                            <p className="text-3xl font-bold tracking-tight">{correctCount}</p>
                        </div>
                        
                        <div className="flex flex-col gap-3 p-5 rounded-2xl border bg-card/50 hover:bg-card/80 transition-colors">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
                                    <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
                                </div>
                                Incorrect
                            </div>
                            <p className="text-3xl font-bold tracking-tight">{incorrectCount}</p>
                        </div>

                        <div className="hidden md:flex flex-col gap-3 p-5 rounded-2xl border bg-card/50 hover:bg-card/80 transition-colors">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                                    <HugeiconsIcon icon={Target02Icon} className="h-5 w-5" />
                                </div>
                                Total Questions
                            </div>
                            <p className="text-3xl font-bold tracking-tight">{sift.questions.length}</p>
                        </div>

                        <div className="hidden md:flex flex-col gap-3 p-5 rounded-2xl border bg-card/50 hover:bg-card/80 transition-colors">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                                    <HugeiconsIcon icon={Time01Icon} className="h-5 w-5" />
                                </div>
                                Total Time
                            </div>
                            <p className="text-3xl font-bold tracking-tight">{duration}</p>
                        </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-0">
                        <Button size="lg" onClick={() => router.push(`/sift/${id}`)} variant="outline" className="h-12 text-base rounded-xl">
                            <HugeiconsIcon icon={ArrowRight01Icon} className="h-5 w-5 rotate-180" />
                            Return
                        </Button>
                        <Button size="lg" onClick={() => router.push(`/sift/${id}?review=${sessionId}`)} variant="outline" className="h-12 text-base rounded-xl col-span-2">
                            Review
                        </Button>
                        <Button size="lg" onClick={handleContinueLearning} className="h-12 text-base rounded-xl col-span-2" disabled={continuing}>
                            {continuing ? (
                                <>
                                    <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
                                    Generating next module...
                                </>
                            ) : (
                                <>
                                    Continue Learning
                                    <HugeiconsIcon icon={ArrowRightIcon} className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
  }

  // --- PLAY VIEW ---
  const currentQ = sift.questions?.[currentQuestionIndex];

  if (!currentQ) {
    return (
        <div className="h-full flex items-center justify-center flex-col gap-4 md:px-4">
            <div className="p-4 bg-background border rounded-full text-primary">
                <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold bg-background">Generating Questions...</h2>
            <p className="text-muted-foreground text-center max-w-md bg-background">
                We're analyzing your content and generating high-quality questions. This might take a moment.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>Check Again</Button>
        </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / sift.questions.length) * 100;
  const options = (currentQ?.options as string[]) || []; 

  return (
    <div className="max-w-7xl mx-auto flex flex-col px-2 md:px-4">
      {/* Header */}
      <div className="mb-2 space-y-4 bg-background dark:bg-transparent rounded-xl px-4 pt-0 pb-2 md:py-3 border border-border/0">
        <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground truncate max-w-[150px] md:max-w-md" title={sift.source?.title}>
                {sift.source?.title}
            </span>
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs font-medium">
                <span>{currentQuestionIndex + 1}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{sift.questions.length}</span>
            </div>
        </div>
        <Progress value={progress} className="h-2 w-full transition-all duration-500" />
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-[100vw] overflow-hidden">
        <AnimatePresence mode="wait">
            <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ease: easeInOut, duration: 0.3 }}
                className="w-full"
            >
                <Card className="p-4 md:p-8 md:pb-8 min-h-[400px] flex flex-col justify-between border-border/50 bg-card/50 backdrop-blur-sm">
                    <div className="space-y-6 md:space-y-8">
                        <h2 className="text-xl md:text-3xl font-bold leading-tight tracking-tight break-words">
                            {currentQ?.question}
                        </h2>

                        <div className="grid gap-3 mb-6">
                            {options.length > 0 ? (
                                options.map((option, idx) => {
                                    let className = "relative justify-start text-left h-auto py-4 px-4 md:px-6 text-sm md:text-base font-normal transition-all duration-200 group whitespace-normal";
                                    const letter = String.fromCharCode(65 + idx);
                                    
                                    if (showAnswer) {
                                        let isThisCorrect = false;
                                        if (currentQ?.correctOption) {
                                            isThisCorrect = letter === currentQ.correctOption;
                                        } else {
                                            isThisCorrect = option === currentQ?.answer;
                                        }

                                        let isThisSelected = option === selectedOption;

                                        if (isThisCorrect) {
                                            className += " bg-green-500/10 border-green-500 text-green-800 dark:text-green-400 ring-1 ring-green-500";
                                        } else if (isThisSelected && !isThisCorrect) {
                                            className += " bg-red-500/10 border-red-500 text-red-700 dark:text-red-400 ring-1 ring-red-500";
                                        } else {
                                            className += " opacity-50 grayscale";
                                        }
                                    } else {
                                        if (selectedOption === option) {
                                            className += " border-primary bg-primary/5 ring-1 ring-primary";
                                        } else {
                                            className += " hover:bg-muted hover:border-primary/50";
                                        }
                                    }

                                    return (
                                        <Button
                                            key={idx}
                                            variant="outline"
                                            className={className}
                                            onClick={() => handleOptionClick(option)}
                                            disabled={showAnswer}
                                        >
                                            <div className="flex items-center gap-4 w-full">
                                                <span className={cn(
                                                    "flex items-center justify-center h-6 w-6 rounded-md border text-xs font-mono transition-colors shrink-0",
                                                    selectedOption === option ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground bg-muted/20"
                                                )}>
                                                    {letter}
                                                </span>
                                                <span className="flex-1 break-words">{option}</span>
                                                {showAnswer && (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0">
                                                        {(() => {
                                                            let isThisCorrect = false;
                                                            if (currentQ?.correctOption) {
                                                                isThisCorrect = letter === currentQ.correctOption;
                                                            } else {
                                                                isThisCorrect = option === currentQ?.answer;
                                                            }
                                                            if (isThisCorrect) return <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-5 w-5 text-green-600" />;
                                                            if (option === selectedOption) return <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5 text-red-600" />;
                                                            return null;
                                                        })()}
                                                    </motion.div>
                                                )}
                                            </div>
                                        </Button>
                                    );
                                })
                            ) : (
                                <div className="p-8 border-2 border-dashed rounded-xl text-muted-foreground text-center bg-muted/20">
                                    No options provided for this question.
                                </div>
                            )}
                        </div>
                        
                        {showAnswer && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ease:easeInOut}}
                                className="space-y-4"
                            >
                                {currentQ?.explanation && (
                                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 text-sm flex gap-3">
                                        <HugeiconsIcon icon={HelpCircleIcon} className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <span className="font-semibold text-blue-700 dark:text-blue-400 block">Explanation</span>
                                            <span className="text-blue-600/90 dark:text-blue-400/80 leading-relaxed">{currentQ.explanation}</span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    <div className={cn("pt-0 flex items-center justify-between", showAnswer ? "pt-2" : "")}>
                        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                            <HugeiconsIcon icon={KeyboardIcon} className="h-4 w-4" />
                            <span>Press <kbd className="bg-muted px-1 rounded border">A-D</kbd> to select, <kbd className="bg-muted px-1 rounded border">Enter</kbd> to confirm</span>
                        </div>
                        
                        <div className="flex-1 md:flex-none flex justify-end">
                            {!showAnswer ? (
                                <Button 
                                    size="lg" 
                                    className="w-full md:w-auto text-base h-12 px-8 transition-all rounded-xl" 
                                    onClick={handleCheckAnswer}
                                    disabled={!selectedOption}
                                >
                                    Check Answer
                                </Button>
                            ) : (
                                <Button 
                                    size="lg" 
                                    className="w-full md:w-auto text-base h-12 px-8 gap-2 transition-all rounded-xl"
                                    onClick={handleNext}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <>
                                            <HugeiconsIcon icon={Loading03Icon} className="h-5 w-5 animate-spin" />
                                            {currentQuestionIndex === sift.questions.length - 1 ? "Finishing..." : "Processing..."}
                                        </>
                                    ) : (
                                        <>
                                            {currentQuestionIndex === sift.questions.length - 1 ? "Finish Quiz" : "Next Question"}
                                            {currentQuestionIndex !== sift.questions.length - 1 && <HugeiconsIcon icon={ArrowRight01Icon} className="h-5 w-5" />}
                                            {currentQuestionIndex === sift.questions.length - 1 && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-5 w-5" />}
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
