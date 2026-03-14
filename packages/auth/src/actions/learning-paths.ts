import { 
    createLearningPath as dbCreateLearningPath, 
    getLearningPaths as dbGetLearningPaths, 
    getLearningPath as dbGetLearningPath, 
    addSiftToPath as dbAddSiftToPath, 
    insertSiftInPath as dbInsertSiftInPath,
    updatePathSummary as dbUpdatePathSummary,
    refreshPathSummary as dbRefreshPathSummary,
    getLearningPathForSift as dbGetLearningPathForSift,
    getDeepDivesForParent as dbGetDeepDivesForParent,
    deleteLearningPath as dbDeleteLearningPath
} from "@sift/db/queries/learning-paths";
import { auth } from "../index";

// --- Create ---

export async function createLearningPath(goal: string, headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    return await dbCreateLearningPath(session.user.id, goal);
}

// --- Read ---

export async function getLearningPaths(headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        return [];
    }

    return await dbGetLearningPaths(session.user.id);
}

export async function getLearningPath(id: string, headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        return null;
    }

    const path = await dbGetLearningPath(id);

    if (!path || path.userId !== session.user.id) {
        return null;
    }

    return path;
}

export async function getLearningPathForSift(siftId: string, headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        return null;
    }

    const path = await dbGetLearningPathForSift(siftId);

    if (!path || path.userId !== session.user.id) {
        return null;
    }

    return path;
}

// --- Update ---

export async function addSiftToPath(pathId: string, siftId: string, headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Check ownership
    const path = await dbGetLearningPath(pathId);
    if (!path || path.userId !== session.user.id) {
        throw new Error("Unauthorized");
    }

    await dbAddSiftToPath(pathId, siftId);
}

export async function insertSiftInPath(pathId: string, siftId: string, order: number, headers: Headers, parentSiftId?: string) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Check ownership
    const path = await dbGetLearningPath(pathId);
    if (!path || path.userId !== session.user.id) {
        throw new Error("Unauthorized");
    }

    await dbInsertSiftInPath(pathId, siftId, order, parentSiftId);
}

export async function getDeepDivesForParent(pathId: string, parentSiftId: string, headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Check ownership
    const path = await dbGetLearningPath(pathId);
    if (!path || path.userId !== session.user.id) {
        throw new Error("Unauthorized");
    }

    return await dbGetDeepDivesForParent(pathId, parentSiftId);
}

export async function updatePathSummary(pathId: string, newSummary: string, headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Check ownership
    const path = await dbGetLearningPath(pathId);
    if (!path || path.userId !== session.user.id) {
        throw new Error("Unauthorized");
    }

    await dbUpdatePathSummary(pathId, newSummary);
    await dbRefreshPathSummary(pathId);
}

export async function refreshPathSummary(pathId: string, headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    // Check ownership
    const path = await dbGetLearningPath(pathId);
    if (!path || path.userId !== session.user.id) {
        throw new Error("Unauthorized");
    }

    await dbRefreshPathSummary(pathId);
}

export async function deleteLearningPath(pathId: string, headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    if (!session) {
        throw new Error("Unauthorized");
    }

    const path = await dbGetLearningPath(pathId);
    if (!path || path.userId !== session.user.id) {
        throw new Error("Unauthorized");
    }

    return await dbDeleteLearningPath(pathId);
}
