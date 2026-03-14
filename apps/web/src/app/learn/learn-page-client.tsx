"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLearningPathAction, getLearningPathsAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
    Mortarboard02Icon, 
    ArrowRight01Icon, 
    PlusSignIcon,
    Delete01Icon,
    Loading03Icon
} from "@hugeicons/core-free-icons";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Define type based on action return
type LearningPath = Awaited<ReturnType<typeof getLearningPathsAction>>[number];

interface LearningPathsPageClientProps {
    initialPaths: LearningPath[];
}

export default function LearningPathsPageClient({ initialPaths }: LearningPathsPageClientProps) {
    const [paths, setPaths] = useState<LearningPath[]>(initialPaths);
    const [deletingPathId, setDeletingPathId] = useState<string | null>(null);
    const router = useRouter();

    const handleResume = (path: LearningPath) => {
        // if (!path.sifts || path.sifts.length === 0) {
        //     router.push(`/ai?mode=learn&pathId=${path.id}`);
        //     return;
        // }

        // Find the last sift
        // const lastSiftRef = path.sifts[path.sifts.length - 1];
        
        // If we wanted to be smarter, we could check if the last sift is "completed"
        // But for now, jumping to the last added module is the most logical "resume" point
        // as the user might be in the middle of it.
        // router.push(`/sift/${lastSiftRef.siftId}`);

        router.push(`/learn/${path.id}`);
    };

    const handleDelete = async (pathId: string) => {
        setDeletingPathId(pathId);
        try {
            await deleteLearningPathAction(pathId);
            setPaths((current) => current.filter((path) => path.id !== pathId));
            toast.success("Learning path deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete learning path");
        } finally {
            setDeletingPathId(null);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="max-w-7xl mx-auto md:px-4 space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 dark:bg-transparent bg-background" >
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        Learning Paths
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Structured, AI-generated curriculums designed for mastery.
                    </p>
                </div>
                <Button onClick={() => router.push("/ai")} size="lg" className="transition-all h-10 px-4 text-base rounded-xl">
                    <HugeiconsIcon icon={PlusSignIcon} className="mr-1 h-5 w-5" />
                    New Path
                </Button>
            </div>

            {paths.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-background rounded-3xl border-2 border-dashed border-muted-foreground/20 animate-in fade-in slide-in-from-bottom-5 ease-out duration-500">
                    <img src="/sift-mascot.webp" alt="Sift mascot" className="h-28 w-28" />
                    {/* <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                        <HugeiconsIcon icon={Mortarboard02Icon} className="h-10 w-10" />
                    </div> */}
                    <div className="space-y-2 max-w-md">
                        <h3 className="text-xl font-bold">No learning paths yet</h3>
                        <p className="text-muted-foreground">
                            Start a new journey! Sift will generate a personalized curriculum for any topic you want to master.
                        </p>
                    </div>
                    <Button onClick={() => router.push("/ai")} size="lg" className="transition-all h-10 px-4 text-base">
                        Start Learning
                    </Button>
                </div>
            ) : (
                <div 
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {paths.map((path, index) => (
                        <motion.div 
                            key={path.id} 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ type: "spring", stiffness: 260, damping: 20, delay: (index % 3) * 0.05 }}
                        >
                            <Card className="group h-full flex flex-col overflow-hidden border-border/30 bg-card hover:bg-card hover:border-primary/20 transition-all duration-300 hover:shadow-none hover:shadow-primary/5 gap-3">
                                <CardHeader className="flex justify-between items-start pt-0 pb-2">
                                    <CardTitle className="flex flex-row justify-between items-center text-xl font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                        {path.title}
                                    </CardTitle>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                <HugeiconsIcon icon={Delete01Icon} className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <div className="w-full flex flex-col justify-center items-center gap-2">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                                                        <HugeiconsIcon icon={Delete01Icon} className="h-6 w-6 text-red-600 dark:text-red-400" />
                                                    </div>
                                                    <AlertDialogTitle className="text-lg font-semibold">Delete learning path?</AlertDialogTitle>
                                                </div>
                                                <AlertDialogDescription className="text-center text-balance flex flex-col items-center justify-center w-full">
                                                    This deletes the learning path and its modules.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(path.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    {deletingPathId === path.id && <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />}
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    {/* <div className="px-2.5 py-1 rounded-full bg-secondary/50 text-xs font-medium text-secondary-foreground flex items-center gap-1.5">
                                            <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3" />
                                            {new Date(path.updatedAt).toLocaleDateString()}
                                    </div> */}
                                </CardHeader>
                                <CardContent className="flex-1 pb-0">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{path.sifts.length} Modules</span>
                                            {/* Future: Calculate actual completion based on sift status */}
                                            <span>In Progress</span>
                                        </div>
                                        {/* Visual progress bar (placeholder logic for now) */}
                                        <Progress value={Math.min((path.sifts.length / 10) * 100, 100)} className="h-1.5" />
                                        
                                        {path.summary && (
                                            <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground leading-relaxed">
                                                <p className="line-clamp-2">{path.summary.split('\n').slice(0, 3).join(' ').replace(/^- /, '')}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2.5 pb-2.5">
                                    <Button 
                                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 py-[1.1rem]" 
                                        onClick={() => handleResume(path)}
                                    >
                                        Resume Path
                                        <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
