import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const BLOB_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";
const RESULTS_PREFIX = `${BLOB_PREFIX}/game-seo-results`;

export type SeoBlockItem = {
  name: string;
  detail: string;
  advanced?: boolean;
  best?: boolean;
};

export type SeoBlock = {
  id: string;
  label: string;
  labelRu: string;
  description?: string;
  customLabel?: string;
  items: SeoBlockItem[];
  meta?: {
    count?: string;
    structure?: string;
    variant?: string;
  };
};

export type FaqItem = {
  question: string;
  answer: string;
  confirmed?: boolean;
};

export type FaqGroup = {
  id: string;
  labelRu: string;
  labelEn: string;
  items: FaqItem[];
};

export type GameSeoResult = {
  id: string;
  gameName: string;
  date: string;
  blocks: SeoBlock[];
  faqGroups: FaqGroup[];
  generatedText: string;
};

// POST - Save a new result
export async function POST(request: NextRequest) {
  try {
    const result: GameSeoResult = await request.json();

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
    console.error("Error saving game SEO result:", error);
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

    const { blobs } = await list({ prefix: `${RESULTS_PREFIX}/` });

    const results: GameSeoResult[] = [];

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

    // Filter by search query
    const filtered = search
      ? results.filter((r) => r.gameName.toLowerCase().includes(search))
      : results;

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return NextResponse.json({
      results: paginated,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error listing game SEO results:", error);
    return NextResponse.json(
      { error: "Failed to list results" },
      { status: 500 }
    );
  }
}
