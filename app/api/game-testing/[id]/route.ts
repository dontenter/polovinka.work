import { put, del, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const BLOB_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";
const RESULTS_PREFIX = `${BLOB_PREFIX}/game-testing-results`;

// GET - Get a single result by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blobPath = `${RESULTS_PREFIX}/${id}.json`;

    // List blobs to find the exact URL
    const { blobs } = await list({ prefix: blobPath });
    const blob = blobs.find((b) => b.pathname === blobPath);

    if (!blob) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const response = await fetch(blob.url);
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

    // List blobs to find the exact URL
    const { blobs } = await list({ prefix: blobPath });
    const blob = blobs.find((b) => b.pathname === blobPath);

    if (!blob) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    await del(blob.url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting game test result:", error);
    return NextResponse.json(
      { error: "Failed to delete result" },
      { status: 500 }
    );
  }
}
