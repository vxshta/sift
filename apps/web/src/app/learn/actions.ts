"use server";

import { addSiftToPath, getLearningPaths, getLearningPath, getLearningPathForSift, insertSiftInPath, deleteLearningPath } from "@sift/auth/actions/learning-paths";
import { createSift } from "@sift/auth/actions/sifts";
import { createSource } from "@sift/auth/actions/sources";
import { unstable_noStore, unstable_cache, revalidateTag } from "next/cache";
import { generateQuestionsAction } from "../api/ai/action";
import { getRequestContext } from "@/lib/cache";

export async function getLearningPathsAction() {
  const { headerStore, userId } = await getRequestContext();
  if (!userId || userId === "anonymous") {
    throw new Error("Unauthorized");
  }
//   const cached = unstable_cache(
//     () => getLearningPaths(headerStore),
//     ["learning-paths-all", userId],
//     { tags: [`learning-paths-all:${userId}`] }
//   );
//   return cached();
    unstable_noStore();
    return getLearningPaths(headerStore);
}

export async function getLearningPathAction(id: string) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }
    // const cached = unstable_cache(
    //     () => getLearningPath(id, headerStore),
    //     ["learning-path-detail", userId, id],
    //     { tags: [`learning-path-detail:${userId}:${id}`] }
    // );
    // return cached();
    unstable_noStore();
    return getLearningPath(id, headerStore);
}

export async function getLearningPathForSiftAction(siftId: string) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }
    // const cached = unstable_cache(
    //     () => getLearningPathForSift(siftId, headerStore),
    //     ["learning-path-by-sift", userId, siftId],
    //     { tags: [`learning-path-by-sift:${userId}:${siftId}`] }
    // );
    // return cached();
    unstable_noStore();
    return getLearningPathForSift(siftId, headerStore);
}

export async function deleteLearningPathAction(pathId: string) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }

    const result = await deleteLearningPath(pathId, headerStore);
    revalidateTag(`learning-paths-all:${userId}`, "default");
    revalidateTag(`learning-path-detail:${userId}:${pathId}`, "default");
    revalidateTag(`sources-all:${userId}`, "default");
    revalidateTag(`sifts-active:${userId}`, "default");
    revalidateTag(`sifts-archived:${userId}`, "default");
    revalidateTag("sifts-public:global", "default");
    if (result?.siftIds?.length) {
        result.siftIds.forEach((siftId: string) => {
            revalidateTag(`learning-path-by-sift:${userId}:${siftId}`, "default");
            revalidateTag(`sift-detail:${siftId}`, "default");
            revalidateTag(`flashcards-detail:${siftId}`, "default");
        });
    }
    return { success: true };
}

export async function generateNextModuleAction(pathId: string, topic: string, currentSiftId?: string | null) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }

    const existingPath = await getLearningPath(pathId, headerStore);
    if (!existingPath) {
        throw new Error("Learning path not found");
    }

    if (!currentSiftId) {
        const lastSift = existingPath.sifts?.[existingPath.sifts.length - 1];
        if (lastSift?.siftId) {
            return { siftId: lastSift.siftId };
        }
    } else {
        const currentIndex = existingPath.sifts?.findIndex((s: any) => s.siftId === currentSiftId) ?? -1;
        const nextSift = currentIndex >= 0 ? existingPath.sifts?.[currentIndex + 1] : undefined;
        if (nextSift?.siftId) {
            return { siftId: nextSift.siftId };
        }
    }

    // 1. Create Source
    const sourceId = await createSource({
        title: topic,
        fileName: "learning-path-module.txt",
        type: "text",
        content: `Learning Path Module for: ${topic}`,
        isPasted: true,
        metadata: {
            source: "learning-path",
            pathId: pathId
        }
    }, headerStore);

    // 2. Create Sift
    const siftId = await createSift({
        sourceId,
        config: {
            method: "learning-path",
            pathId: pathId
        }
    }, headerStore);

    // 3. Add to Path
    await addSiftToPath(pathId, siftId, headerStore);

    // 4. Trigger AI Generation
    // after(async () => {
    //     try {
    //         await generateQuestionsAction(siftId, topic, 'learn', pathId);
    //     } catch (e) {
    //         console.error("Background processing failed", e);
    //     }
    // });

    // 4. Trigger AI Generation (BLOCKING)
    // We remove 'after' and use 'await' so the function doesn't return 
    // until this completes.
    try {
        await generateQuestionsAction(siftId, topic, 'learn', pathId);
    } catch (e) {
        console.error("Processing failed", e);
        throw new Error("Failed to generate questions"); 
    }
    
    revalidateTag(`learning-paths-all:${userId}`, "default");
    revalidateTag(`learning-path-detail:${userId}:${pathId}`, "default");
    revalidateTag(`learning-path-by-sift:${userId}:${siftId}`, "default");
    revalidateTag(`sources-all:${userId}`, "default");
    revalidateTag(`sifts-active:${userId}`, "default");
    revalidateTag(`sift-detail:${siftId}`, "default");
    return { success: true, siftId };
}

export async function generateDeeperModuleAction(pathId: string, currentSiftId: string) {
    const { headerStore, userId } = await getRequestContext();
    if (!userId || userId === "anonymous") {
        throw new Error("Unauthorized");
    }

    const existingPath = await getLearningPath(pathId, headerStore);
    if (!existingPath) {
        throw new Error("Learning path not found");
    }

    // Check if sifts array exists and is not empty
    if (!existingPath.sifts || existingPath.sifts.length === 0) {
         console.error("Path found but no modules:", JSON.stringify(existingPath, null, 2));
         throw new Error("Learning path has no modules");
    }

    const currentSiftIndex = existingPath.sifts.findIndex((s: any) => s.siftId === currentSiftId);
    if (currentSiftIndex === -1) {
        // Fallback: Check if the ID matches a sourceId instead (sometimes IDs get mixed up in client calls)
        // Or if it's just missing, log it for debugging
        console.error(`Module ${currentSiftId} not found in path ${pathId}. Available sifts:`, existingPath.sifts.map((s:any) => s.siftId));
        throw new Error(`Current module (${currentSiftId}) not found in path`);
    }

    const currentSift = existingPath.sifts[currentSiftIndex];
    const baseSiftId = currentSift.parentSiftId ?? currentSift.siftId;
    const baseSift = existingPath.sifts.find((s: any) => s.siftId === baseSiftId) ?? currentSift;
    const currentTitle = currentSift.sift?.source?.title || "Topic";
    let baseTitle = baseSift.sift?.source?.title || currentTitle;
    while (/^Deep Dive \d+:\s*/.test(baseTitle)) {
        baseTitle = baseTitle.replace(/^Deep Dive \d+:\s*/, "");
    }
    const currentSummary = currentSift.sift?.summary || "";
    const deepDiveContext = `
    CURRENT MODULE ORDER: ${currentSift.order + 1}
    CURRENT MODULE TITLE: ${currentTitle}
    CURRENT MODULE SUMMARY:
    ${currentSummary}
    `;
    // CURRENT MODULE CONTENT:
    // ${currentContent.substring(0, 15000)} // Truncate to avoid excessive tokens, but keep substantial context
    

    // Check for existing deep dives
    const existingDeepDives = existingPath.sifts.filter((s: any) => s.parentSiftId === baseSiftId);
    // Sort by order just in case
    existingDeepDives.sort((a: any, b: any) => a.order - b.order);
    
    let insertAfterOrder = baseSift.order;
    let deepDiveIndex = 1;

    if (existingDeepDives.length > 0) {
        const lastDeepDive = existingDeepDives[existingDeepDives.length - 1];
        insertAfterOrder = lastDeepDive.order;
        deepDiveIndex = existingDeepDives.length + 1;
    }

    const deeperTopic = `Deep Dive ${deepDiveIndex}: ${baseTitle}`;
    
    // Calculate new order
    // We want to insert after the last deep dive (or the current module if no deep dives yet).
    const newOrder = insertAfterOrder + 1;

    // 1. Create Source
    const sourceId = await createSource({
        title: deeperTopic,
        fileName: "learning-path-deep-dive.txt",
        type: "text",
        content: deepDiveContext,
        isPasted: true,
        metadata: {
            source: "learning-path-deep-dive",
            pathId: pathId,
            parentSiftId: baseSiftId
        }
    }, headerStore);

    // 2. Create Sift
    const siftId = await createSift({
        sourceId,
        config: {
            method: "learning-path",
            pathId: pathId
        }
    }, headerStore);

    // 3. Insert into Path
    await insertSiftInPath(pathId, siftId, newOrder, headerStore, baseSiftId);

    // 4. Trigger AI Generation
    try {
        await generateQuestionsAction(siftId, deepDiveContext, 'deep-dive', pathId);
    } catch (e) {
        console.error("Processing failed", e);
        throw new Error("Failed to generate questions"); 
    }
    
    revalidateTag(`learning-paths-all:${userId}`, "default");
    revalidateTag(`learning-path-detail:${userId}:${pathId}`, "default");
    revalidateTag(`learning-path-by-sift:${userId}:${siftId}`, "default");
    revalidateTag(`learning-path-by-sift:${userId}:${currentSiftId}`, "default");
    if (baseSiftId !== currentSiftId) {
        revalidateTag(`learning-path-by-sift:${userId}:${baseSiftId}`, "default");
    }
    revalidateTag(`sources-all:${userId}`, "default");
    revalidateTag(`sifts-active:${userId}`, "default");
    revalidateTag(`sift-detail:${siftId}`, "default");
    return { success: true, siftId };
}
