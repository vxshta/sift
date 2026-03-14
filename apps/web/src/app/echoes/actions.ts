"use server";

import { getEchoes } from "@sift/auth/actions/echoes";
import { unstable_cache } from "next/cache";
import { getRequestContext } from "@/lib/cache";

export async function getEchoesAction() {
  const { headerStore, userId } = await getRequestContext();
  if (!userId || userId === "anonymous") {
    throw new Error("Unauthorized");
  }
  const cached = unstable_cache(
    () => getEchoes(undefined, headerStore),
    ["echoes-progress", userId],
    { tags: [`echoes-progress:${userId}`] }
  );
  return cached();
}
