"use server";

import { createSource, deleteSource, getSources } from "@sift/auth/actions/sources";
import { revalidatePath, revalidateTag, unstable_noStore } from "next/cache";
import { createSift, addQuestions, addSections, updateSiftTakeaways } from "@sift/auth/actions/sifts";
import { addFlashcards } from "@sift/auth/actions/flashcards";
import { createLearningPath, addSiftToPath, updatePathSummary } from "@sift/auth/actions/learning-paths";
import { processSiftContent } from "@/lib/content-processor";
import { generateQuestionsAction } from "@/app/api/ai/action";
import { after } from "next/server";
import { getRequestContext } from "@/lib/cache";

export async function uploadSourceAction(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const text = await file.text(); // Basic text extraction for now
  const { headerStore, userId } = await getRequestContext();
  if (!userId || userId === "anonymous") {
    throw new Error("Unauthorized");
  }

  const sourceId = await createSource({
    title: file.name,
    fileName: file.name,
    type: "text", // Auto-detect later
    content: text,
    isPasted: false,
    metadata: {
        size: file.size,
        type: file.type
    }
  }, headerStore);

  // Create Sift
  const siftId = await createSift({
      sourceId,
      config: {
          method: "upload" 
      }
  }, headerStore);

  // Trigger Async Processing (Reliable background task for Vercel)
  after(async () => {
      try {
          await processSiftContent(siftId, text);
      } catch (e) {
          console.error("Background processing failed", e);
      }
  });

  revalidateTag(`sources-all:${userId}`, "default");
  revalidateTag(`sifts-active:${userId}`, "default");
  return { sourceId, siftId };
}

export async function createTextSourceAction(title: string, content: string) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }
    
    // 1. Create Source
    const sourceId = await createSource({
        title,
        fileName: "pasted-content.txt",
        type: "text",
        content,
        isPasted: true,
        metadata: {
            source: "paste"
        }
    }, headerStore);

    // 2. Create Sift
    const siftId = await createSift({
        sourceId,
        config: {
            method: "paste" 
        }
    }, headerStore);

    // 3. Trigger Async Processing (Reliable background task for Vercel)
    // This handles both JSON parsing and AI generation automatically
    after(async () => {
        try {
            await processSiftContent(siftId, content);
        } catch (e) {
            console.error("Background processing failed", e);
        }
    });

    revalidateTag(`sources-all:${userId}`, "default");
    revalidateTag(`sifts-active:${userId}`, "default");
    return { sourceId, siftId };
}

export async function createTopicSourceAction(topic: string) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }
    
    // 1. Create Source
    const title = topic.length > 50 ? topic.substring(0, 50) + "..." : topic;
    const sourceId = await createSource({
        title,
        fileName: "learning-path.txt",
        type: "text",
        content: `Learning Path for: ${topic}`,
        isPasted: true,
        metadata: {
            source: "topic",
            isLearningPath: true
        }
    }, headerStore);

    // 2. Create Sift
    const siftId = await createSift({
        sourceId,
        config: {
            method: "topic",
            isLearningPath: true
        }
    }, headerStore);

    // 3. Trigger Async Processing
    after(async () => {
        try {
            await generateQuestionsAction(siftId, topic, 'learn');
        } catch (e) {
            console.error("Background processing failed", e);
        }
    });

    revalidateTag(`sources-all:${userId}`, "default");
    revalidateTag(`sifts-active:${userId}`, "default");
    return { sourceId, siftId };
}

export async function createImportedSourceAction(title: string, data: any) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }
    
    // Handle new format: { questions: [], flashcards: [] } or old format: [questions]
    let questions = [];
    let flashcards = [];
    let takeaways = [];

    if (Array.isArray(data)) {
        questions = data;
    } else {
        questions = data.questions || [];
        flashcards = data.flashcards || [];
        takeaways = data.takeaways || [];
    }

    // Create source
    const sourceId = await createSource({
        title,
        fileName: "imported-questions.json",
        type: "json",
        content: JSON.stringify(data),
        isPasted: true,
        metadata: {
            source: "import"
        }
    }, headerStore);

    // Create Sift
    const siftId = await createSift({
        sourceId,
        config: {
            method: "import"
        }
    }, headerStore);

    // Add Questions
    if (questions.length > 0) {
        await addQuestions(siftId, questions, headerStore);
    }

    // Add Flashcards
    const validFlashcards = flashcards.filter((f: any) => f && typeof f.front === 'string' && typeof f.back === 'string');
    if (validFlashcards.length > 0) {
        await addFlashcards(siftId, validFlashcards, headerStore);
    }
    
    // Add Takeaways
    const validTakeaways = takeaways.filter((t: any) => t && typeof t.title === 'string' && typeof t.content === 'string');
    if (validTakeaways.length > 0) {
        await updateSiftTakeaways(siftId, validTakeaways, headerStore);
    }

    revalidateTag(`sources-all:${userId}`, "default");
    revalidateTag(`sifts-active:${userId}`, "default");
    revalidateTag(`sift-detail:${siftId}`, "default");
    revalidateTag(`flashcards-detail:${siftId}`, "default");
    return { sourceId, siftId };
}

export async function createImportedLearningPathAction(title: string, data: any) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }

    // Handle new format: { summary, sections: [] } or old format: [sections]
    const sections = Array.isArray(data) ? data : (data.sections || []);
    const summary = !Array.isArray(data) ? data.summary : null;
    const flashcards = !Array.isArray(data) ? data.flashcards : null;
    const takeaways = !Array.isArray(data) ? data.takeaways : null;

    // 1. Create the Learning Path Container
    const learningPath = await createLearningPath(title, headerStore);
    
    // 2. Create source for the first module
    const sourceId = await createSource({
        title,
        fileName: "imported-learning-path.json",
        type: "json",
        content: JSON.stringify(data),
        isPasted: true,
        metadata: {
            source: "import",
            isLearningPath: true
        }
    }, headerStore);

    // 3. Create Sift for the first module
    const siftId = await createSift({
        sourceId,
        summary: summary,
        config: {
            method: "import",
            isLearningPath: true
        }
    }, headerStore);

    // 4. Link Sift to Learning Path
    await addSiftToPath(learningPath.id, siftId, headerStore);

    // Update Path Summary if available
    if (summary) {
        await updatePathSummary(learningPath.id, summary, headerStore);
    }

    // 5. Save sections first to get IDs
    const sectionsToSave = sections.map((s: any, index: number) => ({
        title: s.title,
        content: s.content,
        order: index
    }));
    
    const savedSections = await addSections(siftId, sectionsToSave, headerStore);
    
    // 6. Map saved sections to questions
    const questionsToSave: any[] = [];
    
    sections.forEach((s: any, index: number) => {
        const savedSection = savedSections.find(sec => sec.order === index);
        
        if (savedSection && s.questions && Array.isArray(s.questions)) {
            s.questions.forEach((q: any) => {
                questionsToSave.push({
                    ...q,
                    sectionId: savedSection.id,
                    tags: [title]
                });
            });
        }
    });

    if (questionsToSave.length > 0) {
            await addQuestions(siftId, questionsToSave, headerStore);
    }

    // 7. Save Flashcards if present
    if (flashcards && Array.isArray(flashcards) && flashcards.length > 0) {
        const validFlashcards = flashcards.filter((f: any) => f && typeof f.front === 'string' && typeof f.back === 'string');
        if (validFlashcards.length > 0) {
            await addFlashcards(siftId, validFlashcards, headerStore);
        }
    }

    // 8. Save Takeaways if present
    if (takeaways && Array.isArray(takeaways) && takeaways.length > 0) {
        const validTakeaways = takeaways.filter((t: any) => t && typeof t.title === 'string' && typeof t.content === 'string');
        if (validTakeaways.length > 0) {
            await updateSiftTakeaways(siftId, validTakeaways, headerStore);
        }
    }
    
    revalidateTag(`learning-paths-all:${userId}`, "default");
    revalidateTag(`learning-path-detail:${userId}:${learningPath.id}`, "default");
    revalidateTag(`learning-path-by-sift:${userId}:${siftId}`, "default");
    revalidateTag(`sources-all:${userId}`, "default");
    revalidateTag(`sifts-active:${userId}`, "default");
    revalidateTag(`sift-detail:${siftId}`, "default");
    revalidateTag(`flashcards-detail:${siftId}`, "default");
    return { sourceId, siftId, pathId: learningPath.id };
}

export async function getSourcesAction() {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }
    // const cached = unstable_cache(
    //     () => getSources(headerStore),
    //     ["sources-all", userId],
    //     { tags: [`sources-all:${userId}`] }
    // );
    // return cached();
    unstable_noStore();
    return getSources(headerStore);
}

export async function deleteSourceAction(id: string) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }
    await deleteSource(id, headerStore);
    revalidatePath("/dashboard");
    revalidateTag(`sources-all:${userId}`, "default");
    revalidateTag(`sifts-active:${userId}`, "default");
    revalidateTag(`sifts-archived:${userId}`, "default");
    revalidateTag("sifts-public:global", "default");
    return { success: true };
}
