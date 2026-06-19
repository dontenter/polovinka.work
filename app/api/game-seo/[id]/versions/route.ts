import { list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { type GameSeoManifest, type GameSeoResult } from "../../route";

const BLOB_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";
const RESULTS_PREFIX = `${BLOB_PREFIX}/game-seo-results`;

async function fetchBlobByPathname<T>(pathname: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: pathname });
    const blob = blobs.find((b) => b.pathname === pathname);
    if (!blob) return null;

    const response = await fetch(blob.url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`Failed to fetch blob ${pathname}:`, error);
    return null;
  }
}

// GET - Return version metadata (no full snapshots) for a result
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const manifestPath = `${RESULTS_PREFIX}/${id}/manifest.json`;
    const manifest = await fetchBlobByPathname<GameSeoManifest>(manifestPath);

    if (manifest) {
      return NextResponse.json({
        id: manifest.id,
        gameName: manifest.gameName,
        date: manifest.date,
        currentVersionId: manifest.currentVersionId,
        versions: manifest.versions,
      });
    }

    // Fallback to old single-blob format: expose it as a single version.
    const oldBlob = await fetchBlobByPathname<GameSeoResult>(
      `${RESULTS_PREFIX}/${id}.json`
    );

    if (!oldBlob) {
      return NextResponse.json(
        { error: "Result not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: oldBlob.id,
      gameName: oldBlob.gameName,
      date: oldBlob.date,
      currentVersionId: "legacy",
      versions: [
        {
          versionId: "legacy",
          createdAt: oldBlob.date,
          changes: [
            {
              field: "none",
              label: "Первоначальная версия",
              description: "Сохранено до появления версионирования",
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error getting game SEO versions:", error);
    return NextResponse.json(
      { error: "Failed to get versions" },
      { status: 500 }
    );
  }
}
