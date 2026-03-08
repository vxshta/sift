"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { 
    getSiftAction, 
    createSessionAction, 
    saveSessionAnswersAction, 
    completeSessionAction, 
    batchUpdateEchoesAction 
} from "../../actions";
import { getLearningPathForSiftAction, generateNextModuleAction } from "../../../learn/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
    ArrowRight01Icon, 
    ArrowRightIcon,
    CheckmarkCircle02Icon, 
    Cancel01Icon, 
    Loading03Icon, 
    HelpCircleIcon, 
    KeyboardIcon,
    Target02Icon,
    Time01Icon,
    ReloadIcon
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { motion, AnimatePresence, easeIn, easeOut, easeInOut } from "framer-motion";
import type { SiftWithQuestions } from "@sift/auth/types";
import { cn } from "@/lib/utils";
import useSound from "use-sound";
import { Streamdown } from "streamdown";
import { Pie, PieChart } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

interface LearningPathPageClientProps {
    id: string;
}

export default function LearningPathPageClient({ id }: LearningPathPageClientProps) {
    const router = useRouter();

    const [sift, setSift] = useState<SiftWithQuestions | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    
    // Session State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const isStartingSession = useRef(false);
    const startTime = useRef<number>(0);
    const [duration, setDuration] = useState<string>("");
    
    // Navigation State
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [viewState, setViewState] = useState<'content' | 'quiz'>('content');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Relative to section
    
    // Quiz State
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [processing, setProcessing] = useState(false);
    
    // Completion State
    const [completed, setCompleted] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const correctCountRef = useRef(0); // Ref for synchronous access during completion
    const [performanceData, setPerformanceData] = useState<{ topic: string, level: number }[]>([]);
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

    const { data: siftData, isLoading: isSiftLoading } = useQuery({
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
            router.push("/ai");
            return;
        }
        isStartingSession.current = true;
        const start = async () => {
            try {
                const newSessionId = await createSessionAction(id);
                setSessionId(newSessionId);
                startTime.current = Date.now();
                setLoading(false);
            } catch (e) {
                console.error(e);
                toast.error("Failed to start session");
                router.push(`/sift/${id}`);
            }
        };
        start();
    }, [id, router, siftData, isSiftLoading]);

    useEffect(() => {
        getLearningPathForSiftAction(id).then(setLearningPath);
    }, [id]);

    // Helpers
    const getCurrentSection = () => sift?.sections?.[currentSectionIndex];
    const getCurrentQuestion = () => getCurrentSection()?.questions?.[currentQuestionIndex];

    const handleOptionClick = useCallback((option: string) => {
        if (showAnswer) return; 
        playClick();
        setSelectedOption(option);
    }, [showAnswer, playClick]);

    const handleCheckAnswer = useCallback(() => {
        const currentQ = getCurrentQuestion();
        if (!selectedOption || !currentQ) return;
        
        setShowAnswer(true);
        
        // Determine correctness for sound
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
            playNotification();
        }
    }, [selectedOption, playSuccess, playNotification, currentSectionIndex, currentQuestionIndex, sift]);

    const advanceSection = useCallback(async (newPerformanceEntry?: { topic: string, level: number }) => {
        if (!sift || !sift.sections) return;
        if (isCompleting) return;
        
        if (currentSectionIndex < sift.sections.length - 1) {
            setCurrentSectionIndex(prev => prev + 1);
            setViewState('content');
            setSelectedOption(null);
            setShowAnswer(false);
        } else {
            // End of Learning Path
            setIsCompleting(true);
            try {
                // Calculate final score using Ref for synchronous accuracy
                const totalQuestions = sift.sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
                const finalScore = totalQuestions > 0 ? Math.round((correctCountRef.current / totalQuestions) * 100) : 100;

                if (sessionId) {
                    await completeSessionAction(sessionId, finalScore);
                    
                    if (sift.sourceId) {
                         const finalPerformanceData = newPerformanceEntry 
                            ? [...performanceData, newPerformanceEntry] 
                            : performanceData;
                         await batchUpdateEchoesAction(sift.sourceId, finalPerformanceData);
                    }
                }

                // Calculate duration
                const timeTaken = Date.now() - startTime.current;
                const minutes = Math.floor(timeTaken / 60000);
                const seconds = Math.floor((timeTaken % 60000) / 1000);
                setDuration(`${minutes}m ${seconds}s`);
                
                setCompleted(true);
                playSuccess();
            } catch (error) {
                console.error("Failed to complete session", error);
                toast.error("Failed to save progress");
                setIsCompleting(false);
            }
        }
    }, [sift, currentSectionIndex, sessionId, performanceData, playSuccess, isCompleting]);

    const handleNext = useCallback(async () => {
        if (!sift || !sift.sections) return;
        const section = sift.sections[currentSectionIndex];
        
        if (viewState === 'content') {
            // Move to quiz
            playClick();
            if (section.questions && section.questions.length > 0) {
                setViewState('quiz');
                setCurrentQuestionIndex(0);
                setSelectedOption(null);
                setShowAnswer(false);
                setProcessing(false);
            } else {
                // No questions, skip to next section
                advanceSection();
            }
        } else {
            // In Quiz Mode
            if (processing) return;
            
            const currentQ = section.questions[currentQuestionIndex];
            if (!currentQ) return;

            setProcessing(true);
            playClick();

            // Calculate Correctness
            let isCorrect = false;
            if (currentQ.correctOption && currentQ.options) {
                const correctIndex = currentQ.correctOption.charCodeAt(0) - 65;
                const selectedIndex = (currentQ.options as string[]).indexOf(selectedOption || "");
                isCorrect = correctIndex === selectedIndex;
            } else {
                isCorrect = selectedOption === currentQ.answer;
            }

            // Update State
            if (isCorrect) {
                setCorrectCount(prev => prev + 1);
                correctCountRef.current += 1; // Update ref synchronously
            }

            // Save Answer
            if (sessionId) {
                await saveSessionAnswersAction(sessionId, [{
                    questionId: currentQ.id,
                    userAnswer: selectedOption || "",
                    isCorrect
                }]).catch(console.error);
            }

            // Track Performance
            const mastery = isCorrect ? 100 : 0;
            let topic = "General";
            if (currentQ.tags && currentQ.tags.length > 0) {
                topic = currentQ.tags[0];
            } else {
                topic = currentQ.question.substring(0, 50) + (currentQ.question.length > 50 ? "..." : "");
            }
            const newPerformanceEntry = { topic, level: mastery };
            setPerformanceData(prev => [...prev, newPerformanceEntry]);

            // Navigate
            if (currentQuestionIndex < section.questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedOption(null);
                setShowAnswer(false);
                setProcessing(false);
            } else {
                // Finished quiz for this section
                // Do NOT reset processing here to prevent double-submission during completion
                advanceSection(newPerformanceEntry);
            }
        }
    }, [sift, currentSectionIndex, viewState, processing, currentQuestionIndex, selectedOption, sessionId, playClick, performanceData, advanceSection]);

    const handleContinueLearning = useCallback(async () => {
        if (!learningPath) {
            router.push(`/sift/${id}`);
            return;
        }
        const currentSiftIndex = learningPath.sifts.findIndex((s: any) => s.siftId === id);
        const nextSift = learningPath.sifts[currentSiftIndex + 1];
        if (nextSift) {
            router.push(`/sift/${nextSift.siftId}/learn`);
            return;
        }
        setContinuing(true);
        try {
            const { siftId } = await generateNextModuleAction(learningPath.id, learningPath.goal, id);
            toast.success("Module generated!");
            router.push(`/sift/${siftId}/learn`);
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
            
            if (viewState === 'quiz') {
                const currentQ = getCurrentQuestion();
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
            } else {
                // Content mode
                if (e.key === 'Enter') {
                    handleNext();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [loading, completed, sift, viewState, showAnswer, selectedOption, handleOptionClick, handleCheckAnswer, handleNext]);

    if (loading || isSiftLoading) return <div className="flex h-[90vh] items-center justify-center flex-col gap-4"><HugeiconsIcon icon={Loading03Icon} className="animate-spin h-10 w-10 text-primary" /><p className="text-muted-foreground">Loading learning path...</p></div>;
    
    if (!sift || !sift.sections || sift.sections.length === 0) return <div className="flex h-full items-center justify-center flex-col gap-4"><p>This Sift does not have a learning path.</p><Button onClick={() => router.push(`/sift/${id}`)}>Go Back</Button></div>;
    
    if (completed) {
        const totalQuestions = sift.sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
        const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;
        const incorrectCount = totalQuestions - correctCount;

        return (
            <div className="flex-1 flex items-center justify-center p-0 w-full animate-in fade-in zoom-in duration-300">
                <Card className="w-full max-w-5xl grid md:grid-cols-2 overflow-hidden border-0 ring-1 ring-border py-0">
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
                                <p className="text-3xl font-bold tracking-tight">{totalQuestions}</p>
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
                            {/* <Button size="lg" onClick={() => window.location.reload()} variant="outline" className="h-12 text-base rounded-xl">
                                <HugeiconsIcon icon={ReloadIcon} className="h-5 w-5" />
                                Retry
                            </Button> */}
                            <Button size="lg" onClick={() => router.push(`/sift/${id}?review=${sessionId}`)} variant="outline" className="h-12 text-base rounded-xl">
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

    const section = sift.sections[currentSectionIndex];
    const totalSections = sift.sections.length;
    // Calculate progress
    const sectionProgress = currentSectionIndex / totalSections;
    // Add +1 to subProgress steps to visually indicate "started" status of current step
    const subProgress = viewState === 'quiz' 
        ? ((currentQuestionIndex + 2) / (section.questions.length + 1)) 
        : (1 / (section.questions.length + 1));
    const progress = (sectionProgress + (subProgress / totalSections)) * 100;

    const currentQuestion = section.questions[currentQuestionIndex];
    const options = (currentQuestion?.options as string[]) || [];

    return (
        <div className="mx-auto md:px-4 space-y-6 flex flex-col font-jakarta">
            {/* Header */}
            <div className="mb-2 space-y-4 bg-background dark:bg-transparent rounded-xl px-4 md:py-3 border border-border/0">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push(`/sift/${id}`)} 
                            className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 mr-2" />
                            Exit
                        </Button>
                        <div className="h-4 w-px bg-border hidden sm:block" />
                        <span className="font-medium text-muted-foreground truncate max-w-[150px] md:max-w-md hidden sm:inline-block" title={sift.source?.title}>
                            {sift.source?.title}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs font-medium">
                        <span className="text-muted-foreground">Section</span>
                        <span>{currentSectionIndex + 1}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{totalSections}</span>
                    </div>
                </div>
                <Progress value={progress} className="h-2 w-full transition-all duration-500" />
            </div>

            <AnimatePresence mode="wait">
                {viewState === 'content' ? (
                    <motion.div 
                        key="content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ease:easeInOut}}
                        className="flex-1"
                    >
                        <Card className="p-4 md:p-8 border-none ring-0 shadow-none rounded-2xl">
                            <div className="pb-3 border-none border-border/50">
                                <h2 className="text-3xl font-bold text-primary tracking-tight">{section.title}</h2>
                            </div>
                            <div className="prose dark:prose-invert max-w-none">
                                <Streamdown className="text-base md:text-lg" mode="static">{section.content}</Streamdown>
                            </div>
                            <div className="flex justify-end pt-6 border-none border-border/50">
                                <Button onClick={handleNext} className="gap-2 text-base h-12 px-8 rounded-xl shadow-none">
                                    {section.questions.length > 0 ? "Next Section" : "Next Section"}
                                    <HugeiconsIcon icon={ArrowRight01Icon} className="h-5 w-5" />
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="quiz"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ease:easeInOut}}
                        className="flex-1 flex flex-col justify-center"
                    >
                        {/* Quiz Card from Play Route */}
                        <Card className="p-4 md:p-8 md:pb-8 min-h-[400px] flex flex-col justify-between border-border/0 ring-0 bg-card/50 backdrop-blur-sm shadow-none">
                            <div className="space-y-6 md:space-y-8">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0">
                                    <span className="block md:hidden text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full whitespace-nowrap">
                                    {/* <span className="block md:hidden self-end text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full whitespace-nowrap"></span> */}
                                        Question {currentQuestionIndex + 1}/{section.questions.length}
                                    </span>
                                    <h2 className="text-xl md:text-3xl font-bold leading-tight tracking-tight break-words">
                                        {currentQuestion?.question}
                                    </h2>
                                    <span className="hidden md:block text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full whitespace-nowrap ml-4">
                                        Question {currentQuestionIndex + 1}/{section.questions.length}
                                    </span>
                                </div>

                                <div className="grid gap-3 mb-6">
                                    {options.length > 0 ? (
                                        options.map((option, idx) => {
                                            let className = "relative justify-start text-left h-auto py-4 px-4 md:px-6 text-sm md:text-base font-normal transition-all duration-200 group whitespace-normal shadow-none";
                                            const letter = String.fromCharCode(65 + idx);
                                            
                                            if (showAnswer) {
                                                let isThisCorrect = false;
                                                if (currentQuestion?.correctOption) {
                                                    isThisCorrect = letter === currentQuestion.correctOption;
                                                } else {
                                                    isThisCorrect = option === currentQuestion?.answer;
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
                                                                    if (currentQuestion?.correctOption) {
                                                                        isThisCorrect = letter === currentQuestion.correctOption;
                                                                    } else {
                                                                        isThisCorrect = option === currentQuestion?.answer;
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
                                        {currentQuestion?.explanation && (
                                            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 text-sm flex gap-3">
                                                <HugeiconsIcon icon={HelpCircleIcon} className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <span className="font-semibold text-blue-700 dark:text-blue-400 block">Explanation</span>
                                                    <span className="text-blue-600/90 dark:text-blue-400/80 leading-relaxed">{currentQuestion.explanation}</span>
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
                                            className="w-full md:w-auto text-base h-12 px-8 transition-all shadow-none" 
                                            onClick={handleCheckAnswer}
                                            disabled={!selectedOption}
                                        >
                                            Check Answer
                                        </Button>
                                    ) : (
                                        <Button 
                                            size="lg" 
                                            className="w-full md:w-auto text-base h-12 px-8 gap-2 transition-all shadow-none"
                                            onClick={handleNext}
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <>
                                                    <HugeiconsIcon icon={Loading03Icon} className="h-5 w-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    {currentQuestionIndex === section.questions.length - 1 ? (currentSectionIndex === totalSections - 1 ? "Finish Path" : "Next Section") : "Next Question"}
                                                    <HugeiconsIcon icon={ArrowRight01Icon} className="h-5 w-5" />
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
