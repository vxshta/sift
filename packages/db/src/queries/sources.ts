import { db } from "..";
import { sources } from "../schema/sources";
import { eq, desc } from "drizzle-orm";
import type { Source, NewSource, SourceType, SourceWithSifts } from "../types";

export type CreateSourceInput = {
  title: string;
  fileName?: string;
  type: SourceType;
  content?: string;
  originalUrl?: string;
  isPasted?: boolean;
  metadata?: Record<string, any>;
};

export async function createSource(userId: string, data: CreateSourceInput) {
  const id = crypto.randomUUID();
  const newSource: NewSource = {
    id,
    userId,
    ...data,
  };
  await db.insert(sources).values(newSource);
  return id;
}

export async function getSources(userId: string): Promise<SourceWithSifts[]> {
  const result = await db.query.sources.findMany({
    where: eq(sources.userId, userId),
    orderBy: desc(sources.createdAt),
    with: {
        sifts: {
          with: {
            learningPathSifts: true
          }
        }
    }
  });
  return result as SourceWithSifts[];
}

export async function getSource(id: string): Promise<Source | undefined> {
  return await db.query.sources.findFirst({
    where: eq(sources.id, id),
  });
}

export async function deleteSource(id: string) {
  return await db.delete(sources).where(eq(sources.id, id));
}
