// Shared helpers for maintaining an index.json over Vercel Blob results.
// The index keeps lightweight metadata so we never have to list+fetch every blob
// just to render a paginated list.

import { list, put } from "@vercel/blob";

const ENV_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";

export interface BaseIndexEntry {
  id: string;
  gameName: string;
  date: string;
  url: string;
  pathname: string;
}

interface CacheItem<T> {
  data: T[];
  expiresAt: number;
}

const INDEX_TTL_MS = 15_000; // 15 seconds
const cache = new Map<string, CacheItem<unknown>>();

function cacheKey(prefix: string): string {
  return `${ENV_PREFIX}:${prefix}:index`;
}

export function invalidateIndexCache(prefix: string): void {
  cache.delete(cacheKey(prefix));
}

export async function readIndex<T extends BaseIndexEntry>(
  prefix: string,
  mapBlob?: (data: unknown, blob: { url: string; pathname: string }) => T | null
): Promise<T[]> {
  const key = cacheKey(prefix);
  const cached = cache.get(key) as CacheItem<T> | undefined;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const indexPath = `${prefix}/index.json`;

  try {
    const { blobs } = await list({ prefix: indexPath });
    const indexBlob = blobs.find((b) => b.pathname === indexPath);

    if (!indexBlob) {
      throw new Error("Index blob not found");
    }

    const response = await fetch(indexBlob.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.status}`);
    }

    const data = (await response.json()) as T[];
    cache.set(key, { data, expiresAt: Date.now() + INDEX_TTL_MS });
    return data;
  } catch (error) {
    if (mapBlob) {
      console.warn(`Index missing or unreadable for ${prefix}, rebuilding...`, error);
      return rebuildIndex(prefix, mapBlob);
    }
    console.error(`Failed to read index for ${prefix} and no rebuild mapper provided`, error);
    return [];
  }
}

export async function writeIndex<T extends BaseIndexEntry>(
  prefix: string,
  entries: T[]
): Promise<void> {
  const indexPath = `${prefix}/index.json`;

  // Keep the index sorted by date descending so consumers don't have to.
  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  await put(indexPath, JSON.stringify(sorted), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });

  invalidateIndexCache(prefix);
  cache.set(cacheKey(prefix), { data: sorted, expiresAt: Date.now() + INDEX_TTL_MS });
}

export async function rebuildIndex<T extends BaseIndexEntry>(
  prefix: string,
  mapBlob: (data: unknown, blob: { url: string; pathname: string }) => T | null
): Promise<T[]> {
  console.log(`Rebuilding index for ${prefix}...`);

  const { blobs } = await list({ prefix: `${prefix}/` });
  const entries: T[] = [];

  // Fetch all result blobs in parallel. This only runs when the index is missing.
  await Promise.all(
    blobs
      .filter((b) => !b.pathname.endsWith("/index.json"))
      .map(async (blob) => {
        try {
          const response = await fetch(blob.url);
          if (response.ok) {
            const data = await response.json();
            const entry = mapBlob(data, { url: blob.url, pathname: blob.pathname });
            if (entry) {
              entries.push(entry);
            }
          } else {
            console.error(`Failed to fetch blob ${blob.url}: ${response.status}`);
          }
        } catch (e) {
          console.error(`Failed to fetch blob ${blob.url}:`, e);
        }
      })
  );

  await writeIndex(prefix, entries);
  return entries;
}
