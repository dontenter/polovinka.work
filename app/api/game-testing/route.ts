import { put, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  readIndex,
  writeIndex,
  type BaseIndexEntry,
} from "@/lib/blob-index";

const BLOB_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";
const RESULTS_PREFIX = `${BLOB_PREFIX}/game-testing-results`;

interface GameTestIndexEntry extends BaseIndexEntry {
  ratingScore: number;
  hasFailedBasicChecks: boolean;
}

export type GameTestResult = {
  id: string;
  gameName: string;
  date: string;
  basicChecks: Record<string, boolean | undefined>;
  features: {
    id: string;
    name: string;
    applicable: boolean;
    checkedItems: string[];
    failedItems?: Record<string, number[]>;
  }[];
  ratingCriteria: {
    id: string;
    label: string;
    weight: number;
    checked: boolean;
  }[];
  ratingScore: number;
  ratingRawScore: number;
  detailedAnswers?: Record<string, string>;
  generatedDescription?: string;
  hasFailedBasicChecks: boolean;
  basicCheckIssues?: Record<string, number[]>;
  feedbackText?: string;
};

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

// POST - Save a new result
export async function POST(request: NextRequest) {
  try {
    const result: GameTestResult = await request.json();

    if (!result.id || !result.gameName) {
      console.error("Missing required fields:", { id: result.id, gameName: result.gameName });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const blobPath = `${RESULTS_PREFIX}/${result.id}.json`;
    const blob = await put(blobPath, JSON.stringify(result), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    // Update the lightweight index
    const entries = await readIndex<GameTestIndexEntry>(RESULTS_PREFIX, mapBlobToEntry);
    const existingIndex = entries.findIndex((e) => e.id === result.id);
    const entry: GameTestIndexEntry = {
      id: result.id,
      gameName: result.gameName,
      date: result.date,
      url: blob.url,
      pathname: blob.pathname,
      ratingScore: result.ratingScore,
      hasFailedBasicChecks: result.hasFailedBasicChecks,
    };

    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }

    await writeIndex(RESULTS_PREFIX, entries);

    return NextResponse.json({ success: true, blob });
  } catch (error) {
    console.error("Error saving game test result:", error);
    return NextResponse.json(
      { error: "Failed to save result", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET - List results with pagination and optional search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    const entries = await readIndex<GameTestIndexEntry>(RESULTS_PREFIX, mapBlobToEntry);

    // Filter by search query
    const filtered = search
      ? entries.filter((r) => r.gameName.toLowerCase().includes(search))
      : entries;

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return NextResponse.json({
      results: paginated,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error listing game test results:", error);
    return NextResponse.json(
      { error: "Failed to list results" },
      { status: 500 }
    );
  }
}
