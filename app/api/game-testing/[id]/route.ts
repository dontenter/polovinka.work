import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  readIndex,
  writeIndex,
  type BaseIndexEntry,
} from "@/lib/blob-index";
import { type GameTestResult } from "../route";

const BLOB_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";
const RESULTS_PREFIX = `${BLOB_PREFIX}/game-testing-results`;

interface GameTestIndexEntry extends BaseIndexEntry {
  ratingScore: number;
  hasFailedBasicChecks: boolean;
}

function mapBlobToEntry(
  data: unknown,
  blob: { url: string; pathname: string }
): GameTestIndexEntry | null {
  if (!data || typeof data !== "object") return null;
  const result = data as GameTestResult;
  if (!result.id || !result.gameName || !result.date) return null;

  return {
    id: result.id,
    gameName: result.gameName,
    date: result.date,
    url: blob.url,
    pathname: blob.pathname,
    ratingScore: result.ratingScore,
    hasFailedBasicChecks: result.hasFailedBasicChecks,
  };
}

// GET - Get a single result by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entries = await readIndex<GameTestIndexEntry>(RESULTS_PREFIX, mapBlobToEntry);
    const entry = entries.find((e) => e.id === id);

    if (!entry) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const response = await fetch(entry.url);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch result" },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error getting game test result:", error);
    return NextResponse.json(
      { error: "Failed to get result" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a result by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blobPath = `${RESULTS_PREFIX}/${id}.json`;
    const entries = await readIndex<GameTestIndexEntry>(RESULTS_PREFIX, mapBlobToEntry);
    const entryIndex = entries.findIndex((e) => e.id === id);

    if (entryIndex === -1) {
      // Fallback: try to delete the blob by pathname even if the index is stale.
      try {
        await del(blobPath);
      } catch (e) {
        // If del throws because the blob is missing, that's still a 404.
        return NextResponse.json({ error: "Result not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    const entry = entries[entryIndex];

    try {
      await del(entry.url);
    } catch (e) {
      console.warn(`Failed to delete blob ${entry.url}, will try pathname fallback`, e);
      try {
        await del(blobPath);
      } catch (fallbackError) {
        return NextResponse.json({ error: "Result not found" }, { status: 404 });
      }
    }

    entries.splice(entryIndex, 1);
    await writeIndex(RESULTS_PREFIX, entries);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting game test result:", error);
    return NextResponse.json(
      { error: "Failed to delete result" },
      { status: 500 }
    );
  }
}
