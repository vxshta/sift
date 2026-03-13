"use client";

import { useCompletion } from "@ai-sdk/react";
import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, CheckmarkCircle02Icon, MagicWand01Icon,AiContentGenerator01Icon, Upload01Icon, FlashIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { createImportedSourceAction, createImportedLearningPathAction } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";
import { SYSTEM_PROMPT } from "@/lib/ai-prompts";

export default function AIPageClient() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Global loading state for generation + saving

  // Direct Generate State
  const [topic, setTopic] = useState("");
  const [planMode, setPlanMode] = useState(false);
  const [learnMode, setLearnMode] = useState(true);
  const [plan, setPlan] = useState("");
  const [showPlanReview, setShowPlanReview] = useState(false);

  // Plan Generator
  const { complete: generatePlan, completion: planStream, isLoading: isPlanning, setCompletion: setPlanCompletion } = useCompletion({
    api: "/api/ai/generate",
    body: { mode: "plan" },
    streamProtocol: "text",
    onFinish: (_prompt, result) => {
        setPlan(result);
        setShowPlanReview(true);
    },
    onError: (err) => {
        console.error("Plan generation error:", err);
        toast.error("Failed to generate plan. Please try again.");
    }
  });

  // Question/Learning Path Generator
  const { complete: generateQuestions, completion: questionsStream, isLoading: isGeneratingQuestions } = useCompletion({
    api: "/api/ai/generate",
    body: { mode: learnMode ? "learn" : "questions" },
    streamProtocol: "text",
    onFinish: async (_prompt, result) => {
        try {
            const cleaned = result.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsedData = JSON.parse(cleaned);
            
            if (learnMode) {
                // Handle new structure: { summary, sections: [] } or fallback array
                let finalData = parsedData;
                if (!parsedData.sections && Array.isArray(parsedData)) {
                     finalData = { sections: parsedData, summary: "Generated from AI Studio" };
                }
                
                const titleToUse = finalData.title || (topic.length > 50 ? topic.substring(0, 50) + "..." : topic) || "AI Learning Path";
                const { siftId } = await createImportedLearningPathAction(titleToUse, finalData);
                toast.success("Learning path created!");
                router.push(`/sift/${siftId}`);
            } else {
                const titleToUse = parsedData.title || (topic.length > 50 ? topic.substring(0, 50) + "..." : topic) || "AI Generated Sift";
                const { siftId } = await createImportedSourceAction(titleToUse, parsedData);
                toast.success("Sift created!");
                router.push(`/sift/${siftId}`);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to parse AI response. Try again.");
            setIsProcessing(false);
        }
    },
    onError: (err) => {
        console.error("Generation error:", err);
        toast.error("Failed to generate content. Please try again.");
        setIsProcessing(false);
    }
  });

  const handleStartGenerate = () => {
    if (!topic.trim()) return toast.error("Enter a topic");
    
    // Reset states
    setShowPlanReview(false);
    setPlan("");
    setPlanCompletion(""); // Clear previous stream
    
    if (planMode) {
        generatePlan(topic);
    } else {
        setIsProcessing(true);
        generateQuestions(topic);
    }
  };

  const handleContinueWithPlan = () => {
      setIsProcessing(true);
      generateQuestions(plan);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT);
    setCopied(true);
    toast.success("System prompt copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    if (!jsonInput.trim() || !importTitle.trim()) {
        toast.error("Please provide a title and JSON content");
        return;
    }

    try {
        const questions = JSON.parse(jsonInput);
        if (!Array.isArray(questions)) {
            throw new Error("Input must be a JSON array");
        }
        
        setIsImporting(true);
        setIsProcessing(true);
        const { siftId } = await createImportedSourceAction(importTitle, questions);
        toast.success("Questions imported successfully");
        router.push(`/sift/${siftId}`);
    } catch (e) {
        console.error(e);
        toast.error("Invalid JSON format");
        setIsProcessing(false);
    } finally {
        setIsImporting(false);
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
    <div className="py-0 pb-8 md:px-4 mx-auto space-y-8">
        <div className="space-y-2 bg-background dark:bg-transparent rounded-xl">
            <h1 className="text-3xl font-bold tracking-tight">AI Studio</h1>
            <p className="text-muted-foreground">
                Generate courses, quizzes, and flashcards.
            </p>
        </div>

        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            <motion.div variants={item}>
                <Tabs defaultValue="generate" className="space-y-6">
                    {/* <TabsList className="grid w-full grid-cols-3 h-auto">
                        <TabsTrigger value="generate" className="gap-2">
                            <HugeiconsIcon icon={FlashIcon} className="h-4 w-4" />
                            <span className="hidden sm:inline">Direct Generate</span>
                            <span className="inline sm:hidden">Generate</span>
                        </TabsTrigger>
                        <TabsTrigger value="prompt" className="gap-2">
                            <HugeiconsIcon icon={MagicWand01Icon} className="h-4 w-4" />
                            <span className="hidden sm:inline">Get Prompt</span>
                            <span className="inline sm:hidden">Prompt</span>
                        </TabsTrigger>
                        <TabsTrigger value="import" className="gap-2">
                            <HugeiconsIcon icon={Upload01Icon} className="h-4 w-4" />
                            <span className="hidden sm:inline">Import JSON</span>
                            <span className="inline sm:hidden">Import</span>
                        </TabsTrigger>
                    </TabsList> */}

                    <TabsContent value="generate" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Generate from Topic</CardTitle>
                                <CardDescription>
                                    Enter a topic and let Sift AI create a comprehensive quiz for you.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Topic</Label>
                                        <Textarea 
                                            placeholder="e.g. React Hooks, Photosynthesis, World War II..." 
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            disabled={isPlanning || isGeneratingQuestions}
                                            className="min-h-[120px] resize-y"
                                        />
                                    </div>
                                    
                                    <div className="hidden flex items-center space-x-2">
                                        <Switch 
                                            id="plan-mode" 
                                            checked={planMode} 
                                            onCheckedChange={(checked) => {
                                                setPlanMode(checked);
                                                if (checked) setLearnMode(false);
                                            }}
                                            disabled={isPlanning || isGeneratingQuestions}
                                        />
                                        <Label htmlFor="plan-mode">Plan Mode (Review outline before generating)</Label>
                                    </div>

                                    <div className="hidden flex items-center space-x-2">
                                        <Switch 
                                            id="learn-mode" 
                                            checked={learnMode} 
                                            onCheckedChange={(checked) => {
                                                setLearnMode(checked);
                                                if (checked) setPlanMode(false);
                                            }}
                                            disabled={isPlanning || isGeneratingQuestions}
                                        />
                                        <Label htmlFor="learn-mode">Learning Path (Generate structured course with content & quiz)</Label>
                                    </div>

                                    {!showPlanReview && !isGeneratingQuestions && !isPlanning && (
                                        <Button size="lg" onClick={handleStartGenerate} className="gap-2 px-4 py-4">
                                            <HugeiconsIcon icon={AiContentGenerator01Icon} className="h-4 w-4" />
                                            Generate
                                        </Button>
                                    )}
                                </div>

                                {/* Streaming Output / Plan Review */}
                                {(isPlanning || showPlanReview) && (
                                    <div className="space-y-4 pt-4 border-t border-dashed">
                                        <Label>Study Plan</Label>
                                        {isPlanning ? (
                                            <div style={{ outline: 'none' }} className="py-4 px-6 rounded-lg border bg-card text-card-foreground min-h-[200px] text-sm max-h-[500px] overflow-y-auto">
                                                <Markdown>
                                                    {planStream || "Generating plan..."}
                                                </Markdown>
                                            </div>
                                        ) : (
                                            <Textarea 
                                                defaultValue={plan} 
                                                onChange={(e) => setPlan(e.target.value)} 
                                                className="min-h-[300px] font-mono text-sm"
                                            />
                                        )}
                                    
                                        
                                        {showPlanReview && (
                                            <Button onClick={handleContinueWithPlan} className="gap-2 w-full">
                                                <HugeiconsIcon icon={PlayIcon} className="h-4 w-4" />
                                                Continue to Generate Questions
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Question Generation Progress */}
                                {isGeneratingQuestions && (
                                    <div className="space-y-4 pt-4 border-t border-dashed">
                                        <div className="flex items-center gap-2 text-primary animate-pulse">
                                            <HugeiconsIcon icon={AiContentGenerator01Icon} className="h-5 w-5" />
                                            <span className="font-medium">{learnMode ? "Generating Learning Path..." : "Generating Questions..."}</span>
                                        </div>
                                        <div className="p-4 rounded-lg border bg-muted/50 overflow-hidden opacity-50 text-xs font-mono">
                                            {questionsStream}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* <TabsContent value="prompt" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>System Prompt</CardTitle>
                                <CardDescription>
                                    Copy this prompt and paste it into ChatGPT, Claude, or Gemini along with your notes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative rounded-md bg-muted p-4 font-mono text-sm">
                                    <pre className="whitespace-pre-wrap">{SYSTEM_PROMPT}</pre>
                                    <Button 
                                        size="icon" 
                                        variant="secondary" 
                                        className="absolute top-4 right-4 h-8 w-8"
                                        onClick={handleCopyPrompt}
                                    >
                                        {copied ? (
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <HugeiconsIcon icon={Copy01Icon} className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <p className="font-semibold">Instructions:</p>
                                    <ol className="list-decimal list-inside space-y-1 mt-2">
                                        <li>Copy the prompt above.</li>
                                        <li>Paste it into your LLM of choice.</li>
                                        <li>Paste your notes/text after the prompt.</li>
                                        <li>Copy the JSON response it generates.</li>
                                        <li>Come back here and switch to the "Import JSON" tab.</li>
                                    </ol>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent> */}

                    {/* <TabsContent value="import" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Import Questions</CardTitle>
                                <CardDescription>
                                    Paste the JSON generated by the LLM here.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Title</label>
                                    <Input 
                                        placeholder="e.g. Biology Chapter 1 Questions" 
                                        value={importTitle}
                                        onChange={(e) => setImportTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">JSON Content</label>
                                    <Textarea 
                                        placeholder='[{"question": "...", "answer": "..."}]'
                                        className="font-mono min-h-[300px]"
                                        value={jsonInput}
                                        onChange={(e) => setJsonInput(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full" onClick={handleImport} disabled={isImporting}>
                                    {isImporting ? "Importing..." : "Import Questions"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent> */}
                </Tabs>
            </motion.div>
        </motion.div>

        {/* Global Loading Overlay */}
        {isProcessing && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center space-y-6 text-center max-w-md animate-in fade-in zoom-in duration-300 p-8 rounded-xl border bg-card">
                    {/* <div className="relative flex items-center justify-center">
                        <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <HugeiconsIcon icon={MagicWand01Icon} className="h-6 w-6 text-primary animate-pulse" />
                        </div>
                    </div> */}
                    <img
                        src="/sift-mascot.webp"
                        alt="Sift mascot"
                        className={`h-28 w-28 mr-3 mb-2 animate-pulse transition-all duration-500 ${isImporting || isGeneratingQuestions ? "grayscale scale-[0.95] opacity-90" : "grayscale-0 scale-100 opacity-100"}`}
                    />
                    
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold tracking-tight">
                            {isImporting ? "Importing Content..." :
                             isGeneratingQuestions ? (learnMode ? "Building Learning Path..." : "Generating Questions...") :
                             "Finalizing & Redirecting..."}
                        </h3>
                        <p className="text-sm text-muted-foreground text-balance">
                            {isImporting ? "Parsing data and creating your Sift." :
                             isGeneratingQuestions ? "This may take up to 30 seconds; Please don't close this tab." :
                             "Saving your new Sift and preparing the environment."}
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
