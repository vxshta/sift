"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, type Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import localforage from "localforage";
import { authClient } from "@/lib/auth-client";
import { Loading } from "../ui/loading-state";

const PERSISTED_QUERY_KEYS = [
  "sift",
  "flashcards",
  "learning-path",
  "learning-path-for-sift",
] as const;

// const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 365; // 1 year
const CACHE_MAX_AGE = 1000 * 60 * 15;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: "always",
        staleTime: 0,
        retry: 2,
      },
    },
  });

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;

  const [queryClient] = useState(createQueryClient);

  const authReady = useRef(false);
  if (!isPending) {
    authReady.current = true;
  }

  const persister = useMemo(
    () =>
      createAsyncStoragePersister({
        storage: localforage,
        key: `sift-query-cache:${userId ?? "anonymous"}`,
      }),
    [userId]
  );

  const previousUserId = useRef(userId);
  useEffect(() => {
    if (previousUserId.current !== userId) {
      queryClient.clear();
      previousUserId.current = userId;
    }
  }, [queryClient, userId]);

  useEffect(() => {
    if (userId) {
      void localforage.removeItem("sift-query-cache:anonymous");
    }
  }, [userId]);

  if (!authReady.current) {
    return <Loading />
    // return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        dehydrateOptions: {
          shouldDehydrateQuery: (query: Query) => {
            if (!userId) return false;
            const key = String(query.queryKey[0] ?? "");
            return (PERSISTED_QUERY_KEYS as readonly string[]).includes(key);
          },
        },
      }}
    >
      <div className="transition-all animate-in fade-in duration-500">
      {children}
      </div>
    </PersistQueryClientProvider>
  );
}
