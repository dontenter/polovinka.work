import { put, list, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const BLOB_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";
const RESULTS_PREFIX = `${BLOB_PREFIX}/game-testing-results`;

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
  detailedAnswers: Record<string, string>;
  generatedDescription?: string;
  hasFailedBasicChecks: boolean;
  basicCheckIssues?: Record<string, number[]>;
  feedbackText?: string;
};

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

    return NextResponse.json({ success: true, blob });
  } catch (error) {
    console.error("Error saving game test result:", error);
    return NextResponse.json(
      { error: "Failed to save result", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET - List all results
export async function GET() {
  try {
    const { blobs } = await list({ prefix: `${RESULTS_PREFIX}/` });

    const results: GameTestResult[] = [];

    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url);
        if (response.ok) {
          const data = await response.json();
          results.push(data);
        }
      } catch (e) {
        console.error(`Failed to fetch blob ${blob.url}:`, e);
      }
    }

    // Sort by date descending
    results.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error listing game test results:", error);
    return NextResponse.json(
      { error: "Failed to list results" },
      { status: 500 }
    );
  }
}
