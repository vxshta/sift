import { db } from "..";
import { learningPaths, learningPathSifts, sifts, sources } from "../schema";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";

export async function createLearningPath(userId: string, goal: string) {
    const [path] = await db.insert(learningPaths).values({
        id: crypto.randomUUID(),
        userId: userId,
        title: goal, // Ideally generated, but start with goal
        goal: goal,
        summary: "",
    }).returning();
    return path;
}

export async function getLearningPaths(userId: string) {
    return await db.query.learningPaths.findMany({
        where: eq(learningPaths.userId, userId),
        orderBy: [desc(learningPaths.updatedAt)],
        with: {
            sifts: {
                with: {
                    sift: true
                },
                orderBy: (lps, { asc }) => [asc(lps.order)]
            }
        }
    });
}

export async function getLearningPath(id: string) {
    return await db.query.learningPaths.findFirst({
        where: eq(learningPaths.id, id),
        with: {
            sifts: {
                with: {
                    sift: {
                        with: {
                            source: true
                        }
                    }
                },
                orderBy: (lps, { asc }) => [asc(lps.order)]
            }
        }
    });
}

export async function addSiftToPath(pathId: string, siftId: string) {
    // Get current count to determine order
    const existing = await db.select().from(learningPathSifts).where(eq(learningPathSifts.pathId, pathId));
    const order = existing.length;

    await db.insert(learningPathSifts).values({
        id: crypto.randomUUID(),
        pathId,
        siftId,
        order
    });
}

export async function insertSiftInPath(pathId: string, siftId: string, order: number, parentSiftId?: string) {
    // Shift existing items
    await db.update(learningPathSifts)
        .set({ order: sql`${learningPathSifts.order} + 1` })
        .where(and(
            eq(learningPathSifts.pathId, pathId),
            gte(learningPathSifts.order, order)
        ));

    // Insert new item
    await db.insert(learningPathSifts).values({
        id: crypto.randomUUID(),
        pathId,
        siftId,
        order,
        parentSiftId: parentSiftId || null
    });
}

export async function getDeepDivesForParent(pathId: string, parentSiftId: string) {
    return await db.query.learningPathSifts.findMany({
        where: and(
            eq(learningPathSifts.pathId, pathId),
            eq(learningPathSifts.parentSiftId, parentSiftId)
        ),
        orderBy: (lps, { asc }) => [asc(lps.order)]
    });
}

export async function updatePathSummary(pathId: string, newSummary: string) {
    // Append new summary to existing
    const path = await db.query.learningPaths.findFirst({
        where: eq(learningPaths.id, pathId)
    });

    if (!path) return;

    const cleanedSummary = newSummary.trim().replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "");
    if (!cleanedSummary) return;

    const existingLines = (path.summary || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    const normalizedExisting = existingLines.map((line) =>
        line.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "")
    );
    if (normalizedExisting.includes(cleanedSummary)) return;

    const nextIndex = existingLines.length + 1;
    const updatedSummary = path.summary
        ? `${path.summary}\n${nextIndex}. ${cleanedSummary}`
        : `1. ${cleanedSummary}`;

    await db.update(learningPaths)
        .set({ summary: updatedSummary })
        .where(eq(learningPaths.id, pathId));
}

export async function refreshPathSummary(pathId: string) {
    // Fetch all sifts in order
    const path = await db.query.learningPaths.findFirst({
        where: eq(learningPaths.id, pathId),
        with: {
            sifts: {
                with: {
                    sift: {
                        with: {
                            source: true
                        }
                    }
                },
                orderBy: (lps, { asc }) => [asc(lps.order)]
            }
        }
    });

    if (!path || !path.sifts) return;

    // Rebuild summary from ordered sifts
    const summaryParts = path.sifts
        .filter(s => s.sift && s.sift.summary) // Only include completed/generated ones
        .map((s, index) => {
            const summary = s.sift.summary || "";
            const isDeepDive = s.sift.source?.title?.startsWith("Deep Dive") || summary.startsWith("Deep Dive");
            
            // Format: "1. [Summary]" or "1.1 Deep Dive: [Summary]" (conceptual numbering, but simple list is fine)
            // User requested order as prefix.
            // Let's use: "1. [Summary]" for regular, and maybe indentation for deep dive?
            // Actually, flat list with explicit "Deep Dive" label is clearer for LLM context.
            
            let content = summary;
            
            // Clean up existing bullets/numbering if present to avoid "1. - Summary"
            content = content.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '');

            if (isDeepDive && !content.startsWith("Deep Dive")) {
                 content = `Deep Dive: ${content}`;
            }
            
            return `${index + 1}. ${content}`;
        });

    const newSummary = summaryParts.join("\n");

    await db.update(learningPaths)
        .set({ summary: newSummary })
        .where(eq(learningPaths.id, pathId));
}

export async function getLearningPathForSift(siftId: string) {
    const link = await db.query.learningPathSifts.findFirst({
        where: eq(learningPathSifts.siftId, siftId),
        with: {
            path: {
                with: {
                    sifts: {
                        orderBy: (lps, { asc }) => [asc(lps.order)]
                    }
                }
            }
        }
    });

    if (!link) return null;
    return link.path;
}

export async function deleteLearningPath(pathId: string) {
    const pathSifts = await db.query.learningPathSifts.findMany({
        where: eq(learningPathSifts.pathId, pathId),
    });

    const siftIds = pathSifts.map((item) => item.siftId);

    const siftsForPath = siftIds.length
        ? await db.query.sifts.findMany({
            where: inArray(sifts.id, siftIds),
            columns: {
                id: true,
                sourceId: true,
            },
        })
        : [];

    if (siftIds.length) {
        await db.delete(sifts).where(inArray(sifts.id, siftIds));
    }

    await db.delete(learningPaths).where(eq(learningPaths.id, pathId));

    const sourceIds = siftsForPath.map((item) => item.sourceId);
    if (sourceIds.length) {
        const remainingSifts = await db.query.sifts.findMany({
            where: inArray(sifts.sourceId, sourceIds),
            columns: {
                sourceId: true,
            },
        });
        const remainingSourceIds = new Set(remainingSifts.map((item) => item.sourceId));
        const sourcesToDelete = sourceIds.filter((id) => !remainingSourceIds.has(id));
        if (sourcesToDelete.length) {
            await db.delete(sources).where(inArray(sources.id, sourcesToDelete));
        }
    }

    return { siftIds };
}
