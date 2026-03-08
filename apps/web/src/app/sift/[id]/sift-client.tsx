"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { getSiftAction, getSiftSessionsAction, deleteSessionAction, updateSiftAction, deleteSiftAction, getFlashcardsAction } from "../actions";
import { getLearningPathForSiftAction, generateNextModuleAction } from "../../learn/actions";
import { Streamdown } from "streamdown";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, CheckmarkCircle02Icon, Cancel01Icon, HelpCircleIcon, Loading03Icon, PlayIcon, Time01Icon, ChartHistogramIcon, Delete01Icon, Target02Icon, StarIcon, TrendingUp, MoreVerticalIcon, Globe02Icon, SquareLock02Icon, Archive02Icon, Idea01Icon, Book01Icon, ArrowRightIcon, Layers01Icon, PrinterIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { SiftWithQuestions } from "@sift/auth/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Pie, PieChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface SiftSessionPageClientProps {
    id: string;
}

export default function SiftSessionPageClient({ id }: SiftSessionPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewSessionId = searchParams.get("review");

  const [sift, setSift] = useState<(SiftWithQuestions & { isOwner: boolean, isArchived: boolean, isPublic: boolean }) | undefined>(undefined);
  const [sessions, setSessions] = useState<any[]>([]);
  // const [viewMode, setViewMode] = useState<"details" | "review">("details"); // View mode is no longer needed as we split routes
  const [selectedHistorySession, setSelectedHistorySession] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingSift, setIsDeletingSift] = useState(false);
  const [learningPath, setLearningPath] = useState<any>(null);
  const [generatingNext, setGeneratingNext] = useState(false);

  const barChartConfig = {
    score: {
        label: "Score",
        color: "hsl(var(--chart-1))",
    }
  } satisfies ChartConfig;

  const sessionDetailConfig = {
    correct: {
        label: "Correct",
        color: "#22c55e",
    },
    incorrect: {
        label: "Incorrect",
        color: "#ef4444",
    },
  } satisfies ChartConfig;

  // Compute chart data from sessions
  const chartData = sessions
    .filter(s => s.status === "completed" && s.score !== null)
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .map(s => {
        const total = sift?.questions?.length || 0;
        const correct = total > 0 ? Math.round((s.score / 100) * total) : 0;
        return {
            date: new Date(s.completedAt).toLocaleDateString(),
            score: s.score,
            correct,
            incorrect: total - correct,
            total
        };
    });

  const { data: siftData, isLoading: isSiftLoading } = useQuery({
    queryKey: ["sift", id],
    queryFn: () => getSiftAction(id),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24 * 365,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: flashcards } = useQuery({
    queryKey: ["flashcards", id],
    queryFn: () => getFlashcardsAction(id),
    staleTime: Infinity,
    enabled: !!id,
  });

  const loadSessions = useCallback(async () => {
    try {
        setLoading(true);
        const sessionsData = await getSiftSessionsAction(id);
        setSessions(sessionsData);
    } catch (e) {
        console.error("Fetch Sessions Error:", e);
        toast.error("Failed to load session");
    } finally {
        setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (siftData) {
        setSift(siftData);
    }
  }, [siftData]);

  useEffect(() => {
    loadSessions();
    getLearningPathForSiftAction(id).then(setLearningPath);
  }, [loadSessions, id]);

  // Handle review query param redirection
  useEffect(() => {
    if (reviewSessionId) {
        router.push(`/sift/session/${reviewSessionId}`);
    }
  }, [reviewSessionId, router]);

  const handleStartSession = () => {
      router.push(`/sift/${id}/play`);
  };

  const handleStartLearning = () => {
      router.push(`/sift/${id}/learn`);
  };

  const handleDeleteSession = async (sessionId: string) => {
      setDeletingSession(sessionId);
      try {
          await deleteSessionAction(sessionId);
          toast.success("Session deleted");
          loadSessions();
      } catch (e) {
          toast.error("Failed to delete session");
      } finally {
          setDeletingSession(null);
      }
  };

  const handleToggleVisibility = async () => {
    if (!sift) return;
    const newIsPublic = !sift.isPublic;
    try {
        await updateSiftAction(sift.id, { isPublic: newIsPublic });
        setSift({ ...sift, isPublic: newIsPublic });
        toast.success(`Sift is now ${newIsPublic ? "public" : "private"}`);
    } catch (e) {
        toast.error("Failed to update visibility");
    }
  };

  const handleToggleArchive = async () => {
    if (!sift) return;
    const newIsArchived = !sift.isArchived;
    try {
        await updateSiftAction(sift.id, { isArchived: newIsArchived });
        setSift({ ...sift, isArchived: newIsArchived });
        toast.success(newIsArchived ? "Sift archived" : "Sift unarchived");
        if (newIsArchived) {
            router.push("/sifts");
        }
    } catch (e) {
        toast.error("Failed to update archive status");
    }
  };

  const handleDeleteSift = async () => {
      if (!sift) return;
      setIsDeletingSift(true);
      try {
          await deleteSiftAction(sift.id);
          toast.success("Sift deleted");
          setIsDeleteDialogOpen(false);
          router.push("/sifts");
      } catch (e) {
          toast.error("Failed to delete sift");
          setIsDeletingSift(false);
      }
  };

  const handleGenerateNextModule = async () => {
    if (!learningPath) return;
    setGeneratingNext(true);
    try {
        const { siftId } = await generateNextModuleAction(learningPath.id, learningPath.goal, id);
        toast.success("Module generated!");
        // Refresh learning path to update the button state
        // const updatedPath = await getLearningPathForSiftAction(id);
        // if (updatedPath) {
        //     setLearningPath(updatedPath);
        // }
        router.push(`/sift/${siftId}`);
    } catch (e) {
        toast.error("Failed to generate module");
    } finally {
        setGeneratingNext(false);
    }
  };

  const handleContinueLearning = (nextSiftId: string) => {
    router.push(`/sift/${nextSiftId}`);
  };

  if (isSiftLoading || loading) {
    return (
        <div className="flex h-full items-center justify-center flex-col gap-4">
            <HugeiconsIcon icon={Loading03Icon} className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Loading your sift...</p>
        </div>
    );
  }

  if (!sift) {
      return (
        <div className="flex h-full items-center justify-center flex-col gap-4">
            <div className="p-4 bg-destructive/10 rounded-full text-destructive">
                <HugeiconsIcon icon={Cancel01Icon} className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">Sift Not Found</h2>
            <Button onClick={() => router.push("/sifts")}>Return to Library</Button>
        </div>
      );
  }
  
  const moduleNumber = learningPath?.sifts.find((item: any) => item.siftId === id)?.order;
  const titlePrefix = moduleNumber !== undefined ? `Module ${moduleNumber + 1}: ` : "";

  // --- DETAILS VIEW ---
  return (
    <div className="max-w-7xl mx-auto md:px-4 print:max-w-none print:px-[14mm] print:space-y-0">
        <div className="space-y-8 print:hidden">
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Sift?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this Sift and all its sessions. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSift} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isDeletingSift && <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <Button variant="ghost" className="w-fit -ml-4 text-muted-foreground bg-background" onClick={() => router.push("/sifts")}>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 rotate-180 mr-2" />
                    Back to Library
                </Button>
                
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => window.print()} title="Print Sift" className="text-muted-foreground hover:text-primary">
                         <HugeiconsIcon icon={PrinterIcon} className="size-5" />
                    </Button>
                    {sift.isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <HugeiconsIcon icon={MoreVerticalIcon} className="size-6" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-fit">
                                <DropdownMenuItem onClick={handleToggleVisibility}>
                                    {sift.isPublic ? (
                                        <>
                                            <HugeiconsIcon icon={SquareLock02Icon} className="mr-2 h-4 w-4" />
                                            Make Private
                                        </>
                                    ) : (
                                        <>
                                            <HugeiconsIcon icon={Globe02Icon} className="mr-2 h-4 w-4" />
                                            Make Public
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleToggleArchive}>
                                    <HugeiconsIcon icon={Archive02Icon} className="mr-2 h-4 w-4" />
                                    {sift.isArchived ? "Unarchive Sift" : "Archive Sift"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive hover:text-destructive focus:text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                                    <HugeiconsIcon icon={Delete01Icon} className="mr-2 h-4 w-4 focus:text-destructive hover:text-destructive group-hover:text-destructive text-destructive" />
                                    Delete Sift
                                </DropdownMenuItem>
                                
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            <div className="space-y-2 bg-background dark:bg-transparent rounded-xl">
                <div className="flex items-start justify-between gap-4">
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight line-clamp-2">{`${titlePrefix}${sift.source?.title ?? ""}`}</h1>
                    {sift.isPublic && (
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 shrink-0">
                            Public
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={HelpCircleIcon} className="h-4 w-4" />
                        {sift.questions.length} Questions
                    </span>
                    <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={Time01Icon} className="h-4 w-4" />
                        Created {formatDistanceToNow(new Date(sift.createdAt))} ago
                    </span>
                </div>
            </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-3 space-y-8">
                {/* Hero Card */}
                <Card className="p-8 border-primary/20 justify-center items-center flex flex-col font-jakarta">
                    <div className="space-y-3 text-center">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold">Ready to practice?</h2>
                            <p className="text-lg text-muted-foreground">
                                Start a new session to test your knowledge and improve mastery.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            {sift.sections && sift.sections.length > 0 && (
                                <Button size="lg" className="font-jakarta w-full rounded-xl shadow-none sm:w-auto text-base px-8 h-12 gap-2" onClick={handleStartLearning}>
                                    <HugeiconsIcon icon={Idea01Icon} className="h-6 w-6 fill-current" />
                                    Start Learning
                                </Button>
                            )}
                            <Button size="lg" variant={sift.sections && sift.sections.length > 0 ? "outline" : "default"} className="font-jakarta w-full rounded-xl shadow-none sm:w-auto text-base px-8 h-12 gap-2" onClick={handleStartSession}>
                                <HugeiconsIcon icon={PlayIcon} className="h-6 w-6 fill-current" />
                                {sift.sections && sift.sections.length > 0 ? "Practice Quiz" : "Start New Quiz"}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Learning Path Section */}
                {learningPath && (
                    <Card className="p-6 border-primary/20 bg-background font-jakarta">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-primary font-semibold">
                                    <HugeiconsIcon icon={Book01Icon} className="h-5 w-5" />
                                    Part of Learning Path
                                </div>
                                <h3 className="text-lg font-bold">{learningPath.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                   Module {learningPath.sifts.find((s: any) => s.siftId === id)?.order + 1} of {learningPath.sifts.length}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                {(() => {
                                    const currentSiftIndex = learningPath.sifts.findIndex((s: any) => s.siftId === id);
                                    const nextSift = learningPath.sifts[currentSiftIndex + 1];
                                    
                                    if (nextSift) {
                                        return (
                                            <Button variant="outline" className="font-jakarta w-full rounded-xl shadow-none sm:w-auto text-base px-4 h-12 gap-2 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#00000008_10px,#00000008_11px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ffffff08_10px,#ffffff08_11px)] duration-300 transition-all" onClick={() => handleContinueLearning(nextSift.siftId)}>
                                                Continue Learning
                                                <HugeiconsIcon icon={ArrowRightIcon} className="h-4 w-4" />
                                            </Button>
                                        );
                                    } else {
                                        return (
                                            <Button
                                                size="lg" 
                                                variant="outline"
                                                className="font-jakarta w-full rounded-xl shadow-none sm:w-auto text-base px-4 h-12 gap-2 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#00000008_10px,#00000008_11px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ffffff08_10px,#ffffff08_11px)] duration-300 transition-all"
                                                onClick={handleGenerateNextModule}
                                                disabled={generatingNext}
                                            >
                                                {generatingNext ? (
                                                    <>
                                                        <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* <HugeiconsIcon icon={PlayIcon} className="h-4 w-4 fill-current" /> */}
                                                        {/* Generate Next Module */}
                                                        Continue Learning
                                                    </>
                                                )}
                                            </Button>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Study Tools Grid */}
                {sift.takeaways && (sift.takeaways as any[]).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-jakarta">
                        <Card 
                            className="p-6 border-primary/10 hover:border-primary/30 transition-all cursor-pointer group active:scale-[0.98] duration-200"
                            onClick={() => router.push(`/sift/${id}/takeaways`)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                                    <HugeiconsIcon icon={Idea01Icon} className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg leading-none">Key Takeaways</h3>
                                    <p className="text-sm text-muted-foreground group-hover:text-primary/80 transition-colors">
                                        Review core concepts
                                    </p>
                                </div>
                                <div className="ml-auto text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">
                                    <HugeiconsIcon icon={ArrowRightIcon} className="h-5 w-5" />
                                </div>
                            </div>
                        </Card>

                        <Card 
                            className="p-6 border-primary/10 hover:border-primary/30 transition-all cursor-pointer group active:scale-[0.98] duration-200"
                            onClick={() => router.push(`/sift/${id}/flashcards`)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                                    <HugeiconsIcon icon={Layers01Icon} className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg leading-none">Flashcards</h3>
                                    <p className="text-sm text-muted-foreground group-hover:text-primary/80 transition-colors">
                                        Spaced repetition practice
                                    </p>
                                </div>
                                <div className="ml-auto text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">
                                    <HugeiconsIcon icon={ArrowRightIcon} className="h-5 w-5" />
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Learning Content Section */}
                {sift.sections && sift.sections.length > 0 && (
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold tracking-tight">Learning Material</h2>
                            <Badge variant="outline" className="h-6 bg-background">{sift.sections.length} Section{sift.sections.length !== 1 ? 's' : ''}</Badge>
                        </div>
                        <div className="grid gap-6">
                            {sift.sections.map((section: any, idx: number) => (
                                <Card key={idx} className="p-6 md:p-8 font-jakarta border-primary/10 bg-background/50 backdrop-blur-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 text-sm font-bold mt-1">
                                            {idx + 1}
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold">{section.title}</h3>
                                            <p className="text-sm text-muted-foreground">Section {idx + 1} of {sift.sections?.length}</p>
                                        </div>
                                    </div>
                                    <div className="prose dark:prose-invert max-w-none text-lg">
                                        <Streamdown mode="static">
                                            {section.content}
                                        </Streamdown>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats & Charts Row */}
                <div className="grid md:grid-cols-2 gap-8 w-full min-w-0">
                            {/* Quiz Insights */}
                            <Card className="font-jakarta w-full min-w-0 col-span-2 md:col-span-1">
                            <CardHeader className="min-w-0">
                                <CardTitle className="text-xl flex items-center gap-2 min-w-0">
                                    <HugeiconsIcon icon={StarIcon} className="h-5 w-5 text-primary" />
                                    Quiz Insights
                                </CardTitle>
                                <CardDescription>
                                    Your learning progress at a glance
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 mt-2">
                                <div className="grid grid-cols-2 gap-4">
                                    
                                    <div className="col-span-2 p-4 rounded-xl border bg-muted/20 space-y-2">
                                        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                            <HugeiconsIcon icon={TrendingUp} className="h-4 w-4" />
                                            Current Proficiency
                                        </div>
                                        <div className="flex items-end gap-3 flex-wrap">
                                            <div className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                                                {(() => {
                                                    if (sessions.length === 0) return "Beginner";
                                                    const avg = Math.round(sessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessions.length);
                                                    if (avg >= 90) return (
                                                        <>
                                                            Master
                                                            {/* <HugeiconsIcon icon={StarIcon} className="h-6 w-6 text-yellow-500 fill-yellow-500/20" /> */}
                                                        </>
                                                    );
                                                    if (avg >= 80) return (
                                                        <>
                                                            Expert
                                                            {/* <HugeiconsIcon icon={Award01Icon} className="h-6 w-6 text-purple-500" /> */}
                                                        </>
                                                    );
                                                    if (avg >= 60) return (
                                                        <>
                                                            Intermediate
                                                            {/* <HugeiconsIcon icon={Book01Icon} className="h-6 w-6 text-blue-500" /> */}
                                                        </>
                                                    );
                                                    return (
                                                        <>
                                                            Novice
                                                            {/* <HugeiconsIcon icon={Seedling02Icon} className="h-6 w-6 text-green-500" /> */}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            {/* <div className="text-sm text-muted-foreground mb-1.5 font-medium">
                                                {sessions.length > 0 ? (
                                                    Math.round(sessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessions.length) + "% Avg"
                                                ) : "0% Avg"}
                                            </div> */}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {(() => {
                                                if (sessions.length === 0) return "Complete your first session to establish a baseline.";
                                                const avg = Math.round(sessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessions.length);
                                                if (avg >= 90) return "Outstanding! You've mastered this material.";
                                                if (avg >= 80) return "Great job! You're showing strong understanding.";
                                                if (avg >= 60) return "Good progress. Keep practicing to reach Expert level.";
                                                return "Keep going! Consistent practice is key to improvement.";
                                            })()}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                                        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                            <HugeiconsIcon icon={Target02Icon} className="h-4 w-4" />
                                            Avg. Score
                                        </div>
                                        <div className="text-2xl md:text-3xl font-bold">
                                            {sessions.length > 0 
                                                ? Math.round(sessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessions.length)
                                                : 0}%
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                                        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                            Best Streak
                                        </div>
                                        <div className="text-2xl md:text-3xl font-bold">
                                            {(() => {
                                                let maxStreak = 0;
                                                let currentStreak = 0;
                                                sessions
                                                    .filter(s => s.status === "completed" && s.completedAt)
                                                    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
                                                    .forEach(s => {
                                                        if (s.score >= 80) currentStreak++;
                                                        else currentStreak = 0;
                                                        maxStreak = Math.max(maxStreak, currentStreak);
                                                    });
                                                return maxStreak;
                                            })()}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                                        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                            <HugeiconsIcon icon={HelpCircleIcon} className="h-4 w-4" />
                                            No. of Questions
                                        </div>
                                        <div className="text-2xl md:text-3xl font-bold">
                                            {sift.questions.length}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                                        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                            <HugeiconsIcon icon={Time01Icon} className="h-4 w-4" />
                                            Completed Sessions
                                        </div>
                                        <div className="text-2xl md:text-3xl font-bold">
                                            {sessions.length}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            {/* <CardFooter className="flex-col items-start gap-2 text-sm">
                                <div className="flex gap-2 leading-none font-medium">
                                    {sessions.length > 0 ? (
                                        <>
                                            {(() => {
                                                const lastSession = sessions.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
                                                return `Last session completed ${formatDistanceToNow(new Date(lastSession.completedAt))} ago`;
                                            })()}
                                        </>
                                    ) : (
                                        "Start your first session today"
                                    )}
                                </div>
                                <div className="text-muted-foreground leading-none">
                                    {sessions.length > 0 
                                        ? "You're building a strong study habit" 
                                        : "Consistency is key to mastery"}
                                </div>
                            </CardFooter> */}
                        </Card>

                        {/* Performance Chart */}
                        {chartData.length > 0 ? (
                            <Card className="font-jakarta w-full min-w-0 col-span-2 md:col-span-1">
                                <CardHeader className="min-w-0">
                                    <CardTitle className="text-xl flex items-center gap-2 min-w-0">
                                        <HugeiconsIcon icon={ChartHistogramIcon} className="h-5 w-5" />
                                        Performance History
                                    </CardTitle>
                                    <CardDescription>
                                        {chartData.length > 1 
                                            ? `Last ${chartData.length} sessions performance`
                                            : "Latest session performance"
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px] pr-2 md:pr-4 md:h-[37vh] overflow-hidden">
                                    <ChartContainer className="h-full pt-6 pb-2 w-full" config={barChartConfig}>
                                        <BarChart accessibilityLayer data={chartData}>
                                            <CartesianGrid vertical={false} />
                                            <XAxis 
                                                dataKey="date" 
                                                tickLine={false} 
                                                tickMargin={10} 
                                                axisLine={false} 
                                                tickFormatter={(value) => value} 
                                            />
                                            <YAxis 
                                                tickLine={false} 
                                                axisLine={false} 
                                                domain={[0, 100]} 
                                                tickMargin={10}
                                            />
                                            <ChartTooltip 
                                                cursor={false} 
                                                content={<ChartTooltipContent hideLabel />} 
                                            />
                                            <Bar 
                                                dataKey="score" 
                                                fill="var(--chart-1)" 
                                                radius={8} 
                                                className="cursor-pointer hover:opacity-[0.97] transition-opacity duration-300"
                                                onClick={(data) => {
                                                    if (data) setSelectedHistorySession(data);
                                                }}
                                            />
                                        </BarChart>
                                    </ChartContainer>
                                </CardContent>
                                <CardFooter className="flex-col items-start gap-2 text-sm">
                                    <div className="flex gap-2 leading-none font-medium">
                                        {chartData.length > 1 ? (
                                            <>
                                                {(() => {
                                                    const last = chartData[chartData.length - 1].score;
                                                    const prev = chartData[chartData.length - 2].score;
                                                    const diff = last - prev;
                                                    return diff > 0 
                                                        ? `Trending up by ${diff}%` 
                                                        : diff < 0 
                                                            ? `Trending down by ${Math.abs(diff)}%` 
                                                            : "Maintained same score";
                                                })()}
                                            </>
                                        ) : (
                                            "Complete more sessions to see trends"
                                        )}
                                    </div>
                                    <div className="text-muted-foreground leading-none">
                                        Showing total scores for the last {chartData.length} sessions
                                    </div>
                                </CardFooter>
                            </Card>
                        ) : (
                            <Card className="font-jakarta col-span-2 md:col-span-1 w-full min-w-0 flex items-center justify-center p-8 text-center text-muted-foreground">
                                <div className="space-y-2">
                                    <HugeiconsIcon icon={ChartHistogramIcon} className="h-8 w-8 mx-auto opacity-50" />
                                    <p>No performance data available yet.</p>
                                </div>
                            </Card>
                        )}
                    
                    {/* Detailed Session Graph Modal */}
                    <Dialog open={!!selectedHistorySession} onOpenChange={(open) => !open && setSelectedHistorySession(null)}>
                        <DialogContent className="max-w-md font-jakarta">
                            <DialogHeader className="gap-1">
                                <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                                    <HugeiconsIcon icon={ChartHistogramIcon} className="h-5 w-5" />
                                    Session Breakdown
                                </DialogTitle>
                                <DialogDescription>
                                    Performance details for session on {selectedHistorySession?.date}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 flex justify-center">
                                {selectedHistorySession && (
                                    <div className="relative">
                                        <ChartContainer config={sessionDetailConfig} className="aspect-square h-[200px] w-[200px] font-jakarta">
                                            <PieChart>
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={<ChartTooltipContent hideLabel />}
                                                />
                                                <Pie
                                                    data={[
                                                        { name: 'correct', value: selectedHistorySession.correct, fill: "#22c55e" },
                                                        { name: 'incorrect', value: selectedHistorySession.incorrect, fill: "#ef4444" },
                                                    ]}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    strokeWidth={0}
                                                    cornerRadius={4}
                                                    paddingAngle={4}
                                                />
                                            </PieChart>
                                        </ChartContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <span className="text-3xl font-bold tracking-tighter block">{selectedHistorySession.score}%</span>
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1 block">Score</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium uppercase">Correct</p>
                                        <p className="text-lg font-bold text-green-700 dark:text-green-400">{selectedHistorySession?.correct}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                                        <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium uppercase">Incorrect</p>
                                        <p className="text-lg font-bold text-red-700 dark:text-red-400">{selectedHistorySession?.incorrect}</p>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Card className="font-jakarta col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <HugeiconsIcon icon={Time01Icon} className="h-5 w-5 text-muted-foreground" />
                                        Session History
                                    </CardTitle>
                                    <CardDescription>
                                        Your recent practice sessions and scores
                                    </CardDescription>
                                </div>
                                {sessions.length > 0 && (
                                    <Badge variant="outline" className="px-3 py-1 h-7">
                                        {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {sessions.length > 0 ? (
                                <ScrollArea className="h-[400px] md:pr-4">
                                    <div className="space-y-4">
                                        {[...sessions]
                                            .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
                                            .map((session) => (
                                            <div 
                                                key={session.id} 
                                                onClick={() => router.push(`/sift/session/${session.id}`)}
                                                className="relative flex items-center justify-between p-3 sm:p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 hover:border-primary/20 transition-all group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                                    <div className={cn(
                                                        "h-10 w-12 sm:h-11 sm:w-16 rounded-xl flex items-center justify-center border-2 shrink-0 transition-colors",
                                                        session.status === "completed" 
                                                            ? (session.score >= 80 ? "bg-green-100 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400" 
                                                            : session.score >= 50 ? "bg-yellow-100 border-yellow-200 text-yellow-600 dark:bg-yellow-900/20 dark:border-yellow-900/50 dark:text-yellow-400"
                                                            : "bg-red-100 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400")
                                                            : "bg-muted border-muted-foreground/20 text-muted-foreground"
                                                    )}>
                                                        {session.status === "completed" ? (
                                                            <span className="font-bold text-xs md:text-sm">{session.score}%</span>
                                                        ) : (
                                                            <HugeiconsIcon icon={PlayIcon} className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                                                        )}
                                                    </div>
                                                    
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-medium leading-none truncate text-sm sm:text-base">
                                                                {session.status === "completed" ? "Completed Session" : "Incomplete Session"}
                                                            </h4>
                                                            {session.status === "completed" && session.score >= 90 && (
                                                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 h-5 text-[10px] px-1.5 shrink-0">
                                                                    Excellent
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                                            <span className="flex items-center gap-1 shrink-0">
                                                                <HugeiconsIcon icon={Time01Icon} className="h-3 w-3" />
                                                                {formatDistanceToNow(new Date(session.startedAt))} ago
                                                            </span>
                                                            <span className="hidden sm:inline">•</span>
                                                            <span className="truncate hidden sm:inline">
                                                                {new Date(session.startedAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 pl-2">
                                                    <div className="text-muted-foreground/50 group-hover:text-primary transition-colors">
                                                            <HugeiconsIcon icon={ArrowRight01Icon} className="h-5 w-5" />
                                                    </div>
                                                    
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors z-10 relative"
                                                                disabled={deletingSession === session.id}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {deletingSession === session.id ? (
                                                                    <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <HugeiconsIcon icon={Delete01Icon} className="h-4 w-4" />
                                                                )}
                                                                <span className="sr-only">Delete</span>
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="font-jakarta">
                                                            <AlertDialogHeader>
                                                                <div className="w-full flex flex-col justify-center items-center gap-2">
                                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                                                                        <HugeiconsIcon icon={Delete01Icon} className="h-6 w-6 text-red-600 dark:text-red-400" />
                                                                    </div>
                                                                    <AlertDialogTitle className="text-lg font-semibold">Delete Session?</AlertDialogTitle>
                                                                </div>
                                                                <AlertDialogDescription className="text-center text-balance flex flex-col items-center justify-center w-full">
                                                                    Are you sure you want to delete this session? <br/> This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteSession(session.id);
                                                                    }}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                    <div className="p-4 rounded-full bg-muted/50">
                                        <HugeiconsIcon icon={ChartHistogramIcon} className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg">No sessions yet</h3>
                                        <p className="text-muted-foreground text-sm max-w-[250px]">
                                            Start your first practice session to begin tracking your progress.
                                        </p>
                                    </div>
                                    <Button onClick={handleStartSession} variant="outline" className="mt-2">
                                        Start Session
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                
            </div>

            {/* Sidebar Stats (Placeholder) */}
            <div className="space-y-6">
                {/* Add global mastery stats here later */}
            </div>
        </div>
      </div>

        {/* Printable Content */}
        <div className="hidden print:block text-black font-jakarta">
            <table className="w-full">
                <thead><tr><td><div className="h-[15mm]"></div></td></tr></thead>
                <tbody><tr><td><div className="space-y-8">
            {/* Header / Cover Page */}
            <div className="text-center space-y-6 pb-12 mb-12 break-inside-avoid min-h-[50vh] flex flex-col justify-center">
                <div className="flex justify-center mb-6">
                    <img src="/sift-mascot.png" alt="Sift" className="h-24 w-24 opacity-80" />
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight">{titlePrefix}</h1>
                <h2 className="text-5xl font-extrabold tracking-tight">{sift.source?.title}</h2>
                <div className="flex flex-col items-center justify-center gap-2 text-gray-500 pt-4">
                    <div className="flex items-center gap-2">
                         <span className="font-semibold">{sift.questions.length} Questions</span>
                         <span>•</span>
                         <span>Generated by Sift</span>
                    </div>
                    {/* <p className="text-sm">Printed on {new Date().toLocaleDateString()}</p> */}
                </div>
            </div>

            {/* Takeaways */}
            {sift.takeaways && (sift.takeaways as any[]).length > 0 && (
                <section className="break-before-page break-inside-auto">
                    <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
                        {/* <HugeiconsIcon icon={Idea01Icon} className="h-6 w-6" /> */}
                        Key Takeaways
                    </h2>
                    <div className="grid grid-cols-1 gap-6">
                        {(sift.takeaways as any[]).map((t: any, i: number) => (
                            <div key={i} className="break-inside-avoid">
                                <h3 className="font-bold text-xl mb-2 flex items-start gap-1">
                                    <span>{i + 1}.</span>
                                    {t.title}
                                </h3>
                                <p className="text-lg text-gray-700 text-justify">{t.content}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Learning Material */}
            {sift.sections && sift.sections.length > 0 && (
                <section className="break-before-page">
                    <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
                        Learning Material
                    </h2>
                    <div className="space-y-8">
                        {sift.sections.map((section: any, i: number) => (
                            <div key={i} className="break-inside-avoid">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-1">
                                    {/* <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm">{i + 1}</span> */}
                                    <span>{i + 1}.</span>
                                    {section.title}
                                </h3>
                                <div className="prose max-w-none text-justify text-gray-800">
                                    <Streamdown mode="static">{section.content}</Streamdown>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Flashcards */}
            {flashcards && flashcards.length > 0 && (
                <section className="break-before-page">
                     <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
                        {/* <HugeiconsIcon icon={Layers01Icon} className="h-6 w-6" /> */}
                        Flashcards
                    </h2>
                    {/* <p className="text-sm text-gray-500 mb-6 italic">Cut along the dotted lines to create your flashcards.</p> */}
                    <table className="w-full border-collapse">
                        <tbody>
                            {flashcards.map((card: any, i: number) => (
                                <tr key={i} className="break-inside-avoid h-[200px]">
                                    <td className="w-1/2 p-8 border border-dashed border-gray-300 align-top">
                                        <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block mb-2 font-outfit">Front</span>
                                        <p className="font-semibold text-xl leading-snug">{card.front}</p>
                                    </td>
                                    <td className="w-1/2 p-8 border border-dashed border-gray-300 align-top">
                                        <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block mb-2 font-outfit">Back</span>
                                        <p className="text-gray-600 leading-relaxed">{card.back}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            {/* Quiz Questions (Clean) */}
            <section className="break-before-page">
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
                    {/* <HugeiconsIcon icon={HelpCircleIcon} className="h-6 w-6" /> */}
                    Practice Quiz
                </h2>
                <div className="space-y-8">
                    {sift.questions.map((q: any, i: number) => (
                        <div key={i} className="break-inside-avoid">
                            <div className="flex gap-2">
                                <span className="text-lg font-semibold">{i + 1}.</span>
                                <div className="space-y-4 flex-1">
                                    <p className="text-xl font-medium">{q.question}</p>
                                    <div className="grid grid-cols-1 gap-2 pl-2">
                                        {(q.options as string[])?.map((opt: string, j: number) => (
                                            <div key={j} className="flex items-start gap-1 text-base">
                                                <span className="font-semibold text-gray-500 min-w-[1.25rem]">{String.fromCharCode(65 + j)})</span>
                                                {/* <div className="mt-0.5 w-4 h-4 border border-gray-300 rounded-full flex items-center justify-center shrink-0" /> */}
                                                <span className="text-gray-600">{opt}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Answer Key & Explanations */}
            <section className="break-before-page">
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
                    {/* <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-6 w-6" /> */}
                    Answer Key & Explanations
                </h2>
                <div className="space-y-8">
                    {sift.questions.map((q: any, i: number) => (
                        <div key={i} className="break-inside-avoid">
                            <div className="flex gap-2">
                                <span className="text-xl font-semibold">{i + 1}.</span>
                                <div className="space-y-3 flex-1">
                                    <p className="text-xl font-medium text-gray-900">{q.question}</p>
                                    
                                    <div className="text-base text-gray-900 font-semibold mt-2">
                                        <span className="font-semibold text-gray-900">Option: </span>
                                        {(() => {
                                            const idx = (q.options as string[])?.findIndex((opt: string) => opt === q.answer) ?? -1;
                                            return idx !== -1 ? String.fromCharCode(65 + idx) : "?";
                                        })()}
                                    </div>

                                    <div className="text-base text-gray-600 mt-2">
                                        <span className="font-semibold text-gray-900">Answer: </span>
                                        {q.answer}
                                    </div>

                                    {q.explanation && (
                                        <div className="text-base text-gray-600 mt-2">
                                            <span className="font-semibold text-gray-900">Explanation: </span>
                                            {q.explanation}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

             {/* <div className="text-center text-xs text-gray-400 mt-4">
                Printed from Sift • {new Date().toLocaleDateString()}
            </div> */}
            </div></td></tr></tbody>
            <tfoot><tr><td><div className="h-[15mm]"></div></td></tr></tfoot>
            </table>
        </div>
    </div>
  );
}
