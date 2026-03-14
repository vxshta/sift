"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { addQuestions, addSections, updateSiftSummary, updateSiftTakeaways } from "@sift/auth/actions/sifts";
import { getLearningPath, updatePathSummary, refreshPathSummary } from "@sift/auth/actions/learning-paths";
import { addFlashcards } from "@sift/auth/actions/flashcards";
import { revalidateTag } from "next/cache";
import { eventBus } from "@/lib/events";
import { SYSTEM_PROMPT, LEARNING_PATH_SYSTEM_PROMPT, DEEP_DIVE_SYSTEM_PROMPT } from "@/lib/ai-prompts";
import { getRequestContext } from "@/lib/cache";

// Helper function to pause execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateQuestionsAction(siftId: string, content: string, mode: 'questions' | 'learn' | 'deep-dive' = 'questions', pathId?: string) {
    const MAX_ATTEMPTS = 3;
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }
    
    let systemPrompt = SYSTEM_PROMPT;
    if (mode === 'learn') systemPrompt = LEARNING_PATH_SYSTEM_PROMPT;
    if (mode === 'deep-dive') systemPrompt = DEEP_DIVE_SYSTEM_PROMPT;
    
    let userPrompt = "";

    // Inject Context for Learning Paths
    let contextPrompt = "";
    if ((mode === 'learn' || mode === 'deep-dive') && pathId) {
        const path = await getLearningPath(pathId, headerStore);
        if (path && path.summary) {
            let summary = path.summary;
            if (mode === 'deep-dive') {
                const orderMatch = content.match(/CURRENT MODULE ORDER:\s*(\d+)/);
                if (orderMatch) {
                    const orderIndex = Number(orderMatch[1]);
                    if (Number.isFinite(orderIndex) && orderIndex > 0) {
                        const lines = path.summary
                            .split("\n")
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0);
                        summary = lines.slice(0, orderIndex).join("\n");
                    }
                }
                contextPrompt = `PREVIOUSLY COVERED TOPICS (UP TO CURRENT MODULE):\n${summary}\n\n`;
            } else {
                contextPrompt = `PREVIOUSLY COVERED TOPICS:\n${summary}\n\n`;
            }
        }
    }
    
    if (mode === 'learn') {
        userPrompt = `${contextPrompt}GOAL: ${content}
OUTPUT: Create a structured learning path JSON that follows the system rules.
INSTRUCTION: Create the next logical module in this curriculum based on the PREVIOUSLY COVERED TOPICS (if any) and the GOAL. Do not repeat concepts.
REQUIREMENTS:
- At least 5 sections.
- Each section covers a distinct topic with no repetition.
- Progress from fundamentals to advanced concepts.
- Only include brief recap if absolutely necessary.`;
    } else if (mode === 'deep-dive') {
        const deepDiveContent = content.replace(/CURRENT MODULE ORDER:\s*\d+\s*/g, "").trim();
        userPrompt = `${contextPrompt}CONTEXT:\n${deepDiveContent}
OUTPUT: Create a deep dive module JSON that follows the system rules.
INSTRUCTION: Use the PREVIOUSLY COVERED TOPICS context to avoid repetition and to keep continuity. If the summary contains entries tagged as Deep Dive, treat those as the immediate previous module and continue deeper on that thread.
REQUIREMENTS:
- 3-5 sections exploring advanced nuances.
- Focus on "why" and "how" over "what".
- Include complex scenarios or edge cases.`;
// INSTRUCTION: Create a deep dive module based on the CURRENT MODULE CONTENT provided above. This module should fit into the learning path described in PREVIOUSLY COVERED TOPICS, but strictly focus on deepening the understanding of the CURRENT MODULE
    } else {
        // Default questions mode
        userPrompt = `Here is the content to generate questions from:\n\n${content}`;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            console.log(`Generating ${mode} for Sift: ${siftId} (Attempt ${attempt}/${MAX_ATTEMPTS})`);
            console.log("AI system prompt:", systemPrompt);
            console.log("AI user prompt:", userPrompt);
            
            const { text } = await generateText({
                model: google("gemini-3-flash-preview"),
                system: systemPrompt,
                prompt: userPrompt,
            });

            // 1. Locate JSON
            const jsonStartIndex = text.indexOf((mode === 'learn' || mode === 'deep-dive') ? '{' : '{'); // Changed '[' to '{' for questions mode
            const jsonEndIndex = text.lastIndexOf((mode === 'learn' || mode === 'deep-dive') ? '}' : '}') + 1; // Changed ']' to '}' for questions mode

            if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                 throw new Error("AI did not return a valid JSON");
            }

            // 2. Parse JSON
            const jsonString = text.substring(jsonStartIndex, jsonEndIndex);
            let parsedData: any = JSON.parse(jsonString);

            let questionsCount = 0;

            if (mode === 'learn' || mode === 'deep-dive') {
                // Handle Learning Path (Object with sections and summary)
                if (!parsedData.sections || !Array.isArray(parsedData.sections)) {
                     // Fallback for array output if AI ignores object instruction (backwards compatibility)
                     if (Array.isArray(parsedData)) {
                         parsedData = { sections: parsedData };
                     } else {
                         throw new Error("AI response is not in the expected format");
                     }
                }

                // Fallback: Generate summary if missing (critical for context continuity)
                // if (!parsedData.summary && parsedData.sections && parsedData.sections.length > 0) {
                //      const titles = parsedData.sections.map((s: any) => s.title).join(', ');
                //      parsedData.summary = `Covered concepts: ${titles}`;
                // }

                const sections = parsedData.sections;
                
                // Save sections first to get IDs
                const sectionsToSave = sections.map((s: any, index: number) => ({
                    title: s.title,
                    content: s.content,
                    order: index
                }));
                
                const savedSections = await addSections(siftId, sectionsToSave, headerStore);
                
                // Map saved sections to questions
                const questionsToSave: any[] = [];
                
                sections.forEach((s: any, index: number) => {
                    const savedSection = savedSections.find(sec => sec.order === index);
                    
                    if (savedSection && s.questions && Array.isArray(s.questions)) {
                        s.questions.forEach((q: any) => {
                            questionsToSave.push({
                                ...q,
                                sectionId: savedSection.id,
                                tags: [content] // Use topic/content as tag
                            });
                        });
                    }
                });

                if (questionsToSave.length > 0) {
                     await addQuestions(siftId, questionsToSave, headerStore);
                     questionsCount = questionsToSave.length;
                }

                // Save Flashcards
                if (parsedData.flashcards && Array.isArray(parsedData.flashcards) && parsedData.flashcards.length > 0) {
                     await addFlashcards(siftId, parsedData.flashcards, headerStore);
                }

                // Save Takeaways
                if (parsedData.takeaways && Array.isArray(parsedData.takeaways) && parsedData.takeaways.length > 0) {
                     await updateSiftTakeaways(siftId, parsedData.takeaways, headerStore);
                }

                // Save summary to sift
                if (parsedData.summary) {
                    await updateSiftSummary(siftId, parsedData.summary, headerStore);
                }

                // Update Path Summary
                if (pathId) {
                    // Refresh the summary from all modules to ensure correct order
                    await refreshPathSummary(pathId, headerStore);
                }

            } else {
                // Questions Mode (Standard) - Now expects object with { questions: [], flashcards: [] }
                
                // Handle legacy array format if AI messes up
                let questionsData = [];
                let flashcardsData = [];
                let takeawaysData = [];

                if (Array.isArray(parsedData)) {
                    questionsData = parsedData;
                } else {
                    questionsData = parsedData.questions || [];
                    flashcardsData = parsedData.flashcards || [];
                    takeawaysData = parsedData.takeaways || [];
                }

                // Save Questions
                if (questionsData.length > 0) {
                     await addQuestions(siftId, questionsData, headerStore);
                     questionsCount = questionsData.length;
                }

                // Save Flashcards
                if (flashcardsData.length > 0) {
                    await addFlashcards(siftId, flashcardsData, headerStore);
                }

                // Save Takeaways
                if (takeawaysData.length > 0) {
                     await updateSiftTakeaways(siftId, takeawaysData, headerStore);
                }
                
                // Generate Summary if not present (optional, can be done via separate call/prompt if needed)
                if (content.length > 100) {
                     // Fire and forget summary update? Or rely on questions
                }
            }

            // Success!
            revalidateTag(`sift-detail:${siftId}`, "default");
            revalidateTag(`sifts-active:${userId}`, "default");
            revalidateTag(`flashcards-detail:${siftId}`, "default");
            if (pathId) {
                revalidateTag(`learning-paths-all:${userId}`, "default");
                revalidateTag(`learning-path-detail:${userId}:${pathId}`, "default");
                revalidateTag(`learning-path-by-sift:${userId}:${siftId}`, "default");
            }
            eventBus.emit(`sift-status-${siftId}`, { status: 'completed', message: 'Sift generated successfully!' });
            return { success: true, count: questionsCount };

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            
            // If we have attempts left, wait before retrying (Exponential Backoff)
            if (attempt < MAX_ATTEMPTS) {
                const waitTime = 1000 * attempt; // Wait 1s, then 2s
                console.log(`Retrying in ${waitTime}ms...`);
                await delay(waitTime);
            }
        }
    }

    console.error(`All attempts failed to generate ${mode}.`);
    return { success: false, error: `Failed to generate ${mode} after multiple attempts` };
}
