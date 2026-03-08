"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getSiftAction } from "../../actions";
import { generateNextModuleAction, getLearningPathForSiftAction } from "../../../learn/actions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
    ArrowLeft01Icon, 
    ArrowRight01Icon, 
    ArrowRightIcon,
    Loading03Icon,
    Idea01Icon,
    Tick02Icon,
    RepeatIcon,
    Copy01Icon,
    CheckmarkCircle02Icon
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";
import useSound from "use-sound";

interface TakeawaysPageClientProps {
    id: string;
}

export default function TakeawaysPageClient({ id }: TakeawaysPageClientProps) {
    const router = useRouter();

    const [takeaways, setTakeaways] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sift, setSift] = useState<any>(null);
    const [direction, setDirection] = useState(0); // -1 for prev, 1 for next
    const [isFinished, setIsFinished] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [learningPath, setLearningPath] = useState<any>(null);
    const [continuing, setContinuing] = useState(false);

    // Sounds
    const [playClick] = useSound('/audio/click.wav', { volume: 0.5 });
    const [playSuccess] = useSound('/audio/success.mp3', { volume: 0.5 });

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
            if (siftData.takeaways) {
                setTakeaways(siftData.takeaways as any[]);
            }
        }
    }, [siftData]);

    useEffect(() => {
        if (!isSiftLoading) {
            setLoading(false);
        }
    }, [isSiftLoading]);

    useEffect(() => {
        getLearningPathForSiftAction(id).then(setLearningPath).catch(() => setLearningPath(null));
    }, [id]);

    const handleNext = () => {
        if (currentIndex < takeaways.length - 1) {
            playClick();
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
        } else {
            playSuccess();
            setIsFinished(true);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            playClick();
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleRestart = () => {
        setIsFinished(false);
        setCurrentIndex(0);
        setDirection(0);
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentTakeaway = takeaways[currentIndex];
        const text = `${currentTakeaway.title}\n\n${currentTakeaway.content}`;
        navigator.clipboard.writeText(text);
        setCopiedIndex(currentIndex);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleContinueLearning = async () => {
        if (!learningPath) {
            router.push(`/sift/${id}`);
            return;
        }
        const currentSiftIndex = learningPath.sifts.findIndex((s: any) => s.siftId === id);
        const nextSift = learningPath.sifts[currentSiftIndex + 1];
        if (nextSift) {
            router.push(`/sift/${nextSift.siftId}/takeaways`);
            return;
        }
        setContinuing(true);
        try {
            const { siftId } = await generateNextModuleAction(learningPath.id, learningPath.goal, id);
            toast.success("Module generated!");
            router.push(`/sift/${siftId}/takeaways`);
        } catch (e) {
            toast.error("Failed to generate module");
        } finally {
            setContinuing(false);
        }
    };

    // Keyboard Shortcuts
    useHotkeys('right', () => {
        if (!isFinished) handleNext();
    }, [currentIndex, takeaways.length, isFinished]);

    useHotkeys('left', () => {
        if (!isFinished) handlePrev();
    }, [currentIndex, isFinished]);

    // Added space/enter for next as well since there is no flip
    useHotkeys('space, enter', (e) => {
        e.preventDefault();
        if (!isFinished) handleNext();
    }, [currentIndex, takeaways.length, isFinished]);

    if (loading || isSiftLoading) return (
        <div className="flex h-screen w-full items-center justify-center flex-col gap-4">
            <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-8 w-8 text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Loading takeaways...</p>
        </div>
    );

    if (!sift) return (
        <div className="flex h-full w-full items-center justify-center flex-col gap-4">
            <p className="text-muted-foreground">Sift not found</p>
            <Button onClick={() => router.push("/sifts")}>Go Home</Button>
        </div>
    );

    const progress = ((currentIndex + 1) / takeaways.length) * 100;
    const moduleNumber = learningPath?.sifts?.find((item: any) => item.siftId === id)?.order;
    const titlePrefix = moduleNumber !== undefined ? `Module ${moduleNumber + 1}: ` : "";

    return (
        <div className="text-foreground flex flex-col mx-auto md:px-4 ">
            {/* Header */}
            <header className="bg-background flex items-center justify-between mb-8 md:mb-12 py-3 pr-5 pl-2 rounded-xl transition-all duration-300">
                <Button variant="ghost" className="w-fit text-muted-foreground bg-background flex items-center justify-center" onClick={() => router.push(`/sift/${id}`)}>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 rotate-180 mr-0" />
                    Back
                </Button>
                <div className="flex flex-col items-center transition-all duration-300">
                    <div>
                        <h1 className="text-xl md:text-2xl text-foreground/70 font-semibold tracking-tight font-outfit line-clamp-1 transition-all duration-300">{titlePrefix}{sift.source?.title}</h1>
                        {/* <p className="text-muted-foreground text-sm font-jakarta flex items-center gap-2">
                            {takeaways.length} takeaways
                        </p> */}
                    </div>
                </div>
                {!isFinished && (
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-medium font-mono text-muted-foreground">
                            {currentIndex + 1} / {takeaways.length} cards
                        </span>
                    </div>
                )}
            </header>

            {/* Progress Bar */}
            <div className="w-full max-w-2xl mx-auto mb-8">
                <Progress value={progress} className="h-1.5" />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center relative w-full max-w-3xl mx-auto min-h-[300px]">
                <AnimatePresence mode="wait" custom={direction}>
                    {isFinished ? (
                         <motion.div 
                            key="finished"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="text-center aspect-[3/2] md:aspect-[16/9] space-y-6 w-full h-full bg-card border rounded-3xl p-12 flex flex-col items-center justify-center"
                        >
                            {/* <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-primary/5">
                                <HugeiconsIcon icon={Tick02Icon} className="w-10 h-10 text-primary" />
                            </div> */}
                            <img src="/sift-mascot.webp" alt="Sift mascot" className="h-28 w-28 mb-0" />
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold font-outfit mb-2">All Done!</h2>
                                <p className="text-muted-foreground">You've reviewed all {takeaways.length} takeaways.</p>
                            </div>
                            <div className="flex items-center justify-center gap-3 w-full pb-0 mb-3">
                                <Button onClick={handleRestart} size="lg" variant="outline" className="w-fit gap-2 rounded-xl h-12 text-base px-4">
                                    <HugeiconsIcon icon={RepeatIcon} className="w-5 h-5" />
                                    Review Again
                                </Button>
                                <Button onClick={() => router.push(`/sift/${id}`)} variant="outline" size="lg" className="w-fit rounded-xl h-12 text-base px-4">
                                    Back to Sift
                                </Button>
                            </div>
                            <div className="flex items-center justify-center w-full">
                                <Button onClick={handleContinueLearning} size="lg" className="w-fit gap-2 rounded-xl h-12 text-base px-4" disabled={continuing}>
                                    {continuing ? (
                                        <>
                                            <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                                            Generating next module...
                                        </>
                                    ) : (
                                        <>
                                            Continue Learning
                                            <HugeiconsIcon icon={ArrowRightIcon} className="w-4 h-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    ) : takeaways.length === 0 ? (
                        <div className="text-center space-y-4 max-w-md">
                            <div className="bg-muted w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <HugeiconsIcon icon={Idea01Icon} className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h2 className="text-xl font-semibold">No Takeaways Yet</h2>
                            <p className="text-muted-foreground">Takeaways are being generated in the background. Check back soon!</p>
                            <Button onClick={() => router.refresh()} variant="outline" size="lg" className="w-full gap-2 mt-4">
                                <HugeiconsIcon icon={Loading03Icon} className="w-5 h-5" />
                                Refresh Status
                            </Button>
                        </div>
                    ) : (
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            initial={{ opacity: 0, x: direction * 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: direction * -50 }}
                            transition={{ duration: 0.4, ease: "backOut" }}
                            className="w-full aspect-[3/2] md:aspect-[16/9] relative cursor-pointer group"
                            onClick={handleNext} // Clicking card goes to next
                        >
                            <div className="w-full h-full bg-card border rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center hover:border-border transition-colors duration-300 relative">
                                <div className="absolute top-6 right-6">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={handleCopy}
                                    >
                                        {copiedIndex === currentIndex ? (
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <HugeiconsIcon icon={Copy01Icon} className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                {/* <span className="text-xs font-bold tracking-widest text-primary/60 uppercase mb-6">Takeaway {currentIndex + 1}</span> */}
                                <div className="space-y-4 max-w-2xl">
                                    <h3 className="text-2xl md:text-3xl font-medium font-outfit leading-tight">
                                        {takeaways[currentIndex].title}
                                    </h3>
                                    <p className="text-lg md:text-xl text-muted-foreground font-jakarta leading-relaxed">
                                        {takeaways[currentIndex].content}
                                    </p>
                                </div>
                                
                                <div className="absolute bottom-6 flex items-center gap-2 text-xs font-medium text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="border px-1.5 py-0.5 rounded text-[10px]">SPACE</span>
                                    <span>for next</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Controls */}
            {!isFinished && takeaways.length > 0 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-12 w-12 rounded-xl border" 
                        onClick={handlePrev} 
                        disabled={currentIndex === 0}
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
                    </Button>
                    
                    <Button 
                        size="lg"
                        variant="outline"
                        className="h-12 px-5 rounded-xl text-base font-medium gap-2" 
                        onClick={handleNext}
                    >
                        Next
                        <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
                    </Button>
                </div>
            )}
             
            {/* Keyboard Hints */}
            {!isFinished && takeaways.length > 0 && (
                <div className="mt-8 text-center hidden md:block">
                     <div className="inline-flex items-center gap-6 text-xs text-muted-foreground/60">
                        <span className="flex items-center gap-1.5"><kbd className="border px-1.5 py-0.5 rounded bg-muted/50 font-sans">←</kbd> Prev</span>
                        <span className="flex items-center gap-1.5"><kbd className="border px-1.5 py-0.5 rounded bg-muted/50 font-sans">SPACE</kbd> Next</span>
                        <span className="flex items-center gap-1.5"><kbd className="border px-1.5 py-0.5 rounded bg-muted/50 font-sans">→</kbd> Next</span>
                     </div>
                </div>
            )}
        </div>
    );
}
