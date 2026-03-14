"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLearningPathAction, generateNextModuleAction, getLearningPathAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
    Mortarboard02Icon, 
    ArrowRight01Icon, 
    BookOpen01Icon,
    CheckmarkCircle02Icon,
    CircleIcon,
    Clock01Icon,
    ArrowLeft01Icon,
    Loading03Icon,
    Delete01Icon
} from "@hugeicons/core-free-icons";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type LearningPathDetails = Awaited<ReturnType<typeof getLearningPathAction>>;

interface LearningPathDetailsClientProps {
    path: NonNullable<LearningPathDetails>;
}

export default function LearningPathDetailsClient({ path }: LearningPathDetailsClientProps) {
    const [generating, setGenerating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    const handleContinue = () => {
        if (!path || !path.sifts || path.sifts.length === 0) {
            handleGenerateNext();
            return;
        }

        // Resume from the last module
        const lastSift = path.sifts[path.sifts.length - 1];
        router.push(`/sift/${lastSift.siftId}`);
    };
    
    const handleGenerateNext = async () => {
        if (!path) return;
        setGenerating(true);
        try {
            const lastSiftId = path.sifts[path.sifts.length - 1]?.siftId ?? null;
            const { siftId } = await generateNextModuleAction(path.id, path.goal, lastSiftId);
            toast.success("Module generated!");
            router.push(`/sift/${siftId}`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate module");
            setGenerating(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteLearningPathAction(path.id);
            toast.success("Learning path deleted");
            router.push("/learn");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete learning path");
            setDeleting(false);
        }
    };

    return (
        <div className="mx-auto px-4 space-y-8 pb-8">
             {/* Header */}
             <div className="space-y-2">
                <Button variant="ghost" className="w-fit -ml-4 text-muted-foreground bg-background hover:bg-muted" onClick={() => router.push("/learn")}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4 mr-2" />
                    Back to Paths
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 dark:bg-transparent bg-background">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{path.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <HugeiconsIcon icon={Clock01Icon} className="h-4 w-4" />
                                    Started {formatDistanceToNow(new Date(path.createdAt))} ago
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <HugeiconsIcon icon={BookOpen01Icon} className="h-4 w-4" />
                                    {path.sifts.length} Modules
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
                         <Button size="lg" onClick={handleContinue} className="w-full sm:w-auto px-6 text-base h-11 rounded-xl" disabled={generating}>
                            {path.sifts.length === 0 ? "Start Learning" : "Continue Learning"}
                            <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" onClick={handleGenerateNext} className="w-full sm:w-auto px-6 text-base h-11 rounded-xl" disabled={generating}>
                            {generating ? (
                                <>
                                    <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    {/* <HugeiconsIcon icon={MagicWand01Icon} className="mr-2 h-4 w-4" /> */}
                                    Generate Next Module
                                </>
                            )}
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 text-base h-11 rounded-xl text-destructive border-destructive/30 hover:text-destructive hover:border-destructive/60">
                                    <HugeiconsIcon icon={Delete01Icon} className="mr-2 h-4 w-4" />
                                    Delete Path
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
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}>
                                        {deleting && <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />}
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
             </div>

             {/* Timeline / Module List */}
             <div className="relative py-8 md:py-12 space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0 md:before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {path.sifts.map((item, index) => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (index % 5) * 0.1 }}
                        className="relative flex flex-col md:flex-row items-start md:items-center justify-between md:justify-normal md:even:flex-row-reverse group is-active"
                    >
                        {/* Icon */}
                        <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 hidden md:flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-card shrink-0 z-10">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5 text-primary" />
                        </div>

                        {/* Card */}
                        <div className="w-full md:pl-0 md:w-[calc(50%-2.5rem)]">
                            <Card 
                                className="overflow-hidden transition-all cursor-pointer border-border/60 bg-card/40 py-0 backdrop-blur-sm border group-hover:border-foreground/30 gap-0 hover:bg-card/60"
                                onClick={() => router.push(`/sift/${item.siftId}`)}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Module {index + 1}</span>
                                        <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                        {item.sift?.source?.title || `Module ${index + 1}`}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {item.sift?.summary || "Tap to review concepts and practice questions."}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                ))}
                
                {/* Next Step Placeholder */}
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: path.sifts.length * 0.1 + 0.2 }}
                    className="relative flex flex-col md:flex-row items-start md:items-center justify-between md:justify-normal md:even:flex-row-reverse group"
                >
                    <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 hidden md:flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted shrink-0 z-10">
                        <HugeiconsIcon icon={generating ? Loading03Icon : CircleIcon} className={cn("w-5 h-5 text-muted-foreground", generating && "animate-spin")} />
                    </div>
                    
                    <div className="w-full md:pl-0 md:w-[calc(50%-2.5rem)]">
                        <div 
                            className={cn(
                                "p-6 rounded-xl border-2 border-dashed border-muted flex flex-col items-center justify-center text-muted-foreground text-sm gap-3 cursor-pointer bg-background/50 hover:bg-background hover:text-primary hover:border-primary/20 transition-all duration-300",
                                generating && "opacity-50 pointer-events-none"
                            )}
                            onClick={handleGenerateNext}
                        >
                            <div className="p-3 rounded-full bg-muted/50 group-hover:bg-primary/5 transition-colors">
                                <HugeiconsIcon icon={Mortarboard02Icon} className="h-6 w-6" />
                            </div>
                            <span className="font-medium">
                                {generating ? "Generating next module..." : "Generate next module..."}
                            </span>
                        </div>
                    </div>
                </motion.div>
             </div>
        </div>
    );
}
