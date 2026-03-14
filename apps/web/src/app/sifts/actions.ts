"use server";

import { getSifts, getPublicSifts, getArchivedSifts } from "@sift/auth/actions/sifts";
import { unstable_noStore, unstable_cache } from "next/cache";
import { getRequestContext } from "@/lib/cache";

export async function getSiftsAction() {
  const { headerStore, userId } = await getRequestContext();
  if (!userId || userId === "anonymous") {
    throw new Error("Unauthorized");
  }
  // const cached = unstable_cache(
  //   () => getSifts(headerStore),
  //   ["sifts-active", userId],
  //   { tags: [`sifts-active:${userId}`] }
  // );
  // return cached();
  unstable_noStore();
  return getSifts(headerStore);
}

export async function getArchivedSiftsAction() {
  const { headerStore, userId } = await getRequestContext();
  if (!userId || userId === "anonymous") {
    throw new Error("Unauthorized");
  }
  const cached = unstable_cache(
    () => getArchivedSifts(headerStore),
    ["sifts-archived", userId],
    { tags: [`sifts-archived:${userId}`] }
  );
  return cached();
  // unstable_noStore();
  // return getArchivedSifts(headerStore);
}

export async function getPublicSiftsAction() {
  const { headerStore, userId } = await getRequestContext();
  if (!userId || userId === "anonymous") {
    throw new Error("Unauthorized");
  }
  const cached = unstable_cache(
    () => getPublicSifts(headerStore),
    ["sifts-public"],
    { tags: ["sifts-public:global"] }
  );
  return cached();
  // unstable_noStore();
  // return getPublicSifts(headerStore);
}
