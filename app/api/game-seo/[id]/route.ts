import { put, del, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  readIndex,
  writeIndex,
  type BaseIndexEntry,
} from "@/lib/blob-index";
import { type GameSeoResult, type GameSeoManifest } from "../route";

const BLOB_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";
const RESULTS_PREFIX = `${BLOB_PREFIX}/game-seo-results`;

interface GameSeoIndexEntry extends BaseIndexEntry {
  qcChecked?: boolean;
}

function mapBlobToEntry(
  data: unknown,
  blob: { url: string; pathname: string }
): GameSeoIndexEntry | null {
  if (!data || typeof data !== "object") return null;
  const result = data as GameSeoResult | GameSeoManifest;
  if (!result.id || !result.gameName || !result.date) return null;

  if (blob.pathname.includes("/versions/")) return null;

  return {
    id: result.id,
    gameName: result.gameName,
    date: result.date,
    qcChecked: (result as GameSeoResult | GameSeoManifest).qcChecked === true,
    url: blob.url,
    pathname: blob.pathname,
  };
}

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

// GET - Get a single result by ID, optionally a specific version
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const requestedVersionId = searchParams.get("versionId") || undefined;

    const manifestPath = `${RESULTS_PREFIX}/${id}/manifest.json`;
    const manifest = await fetchBlobByPathname<GameSeoManifest>(manifestPath);

    if (manifest) {
      const versionId = requestedVersionId || manifest.currentVersionId;
      const snapshot = await fetchBlobByPathname<GameSeoResult>(
        `${RESULTS_PREFIX}/${id}/versions/${versionId}.json`
      );

      if (!snapshot) {
        return NextResponse.json(
          { error: "Version snapshot not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ...snapshot,
        versions: manifest.versions,
        currentVersionId: manifest.currentVersionId,
        versionId,
      });
    }

    // Fallback to old single-blob format.
    const oldBlob = await fetchBlobByPathname<GameSeoResult>(
      `${RESULTS_PREFIX}/${id}.json`
    );

    if (!oldBlob) {
      return NextResponse.json(
        { error: "Result not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(oldBlob);
  } catch (error) {
    console.error("Error getting game SEO result:", error);
    return NextResponse.json(
      { error: "Failed to get result" },
      { status: 500 }
    );
  }
}

// PATCH - Toggle the QC checked flag without creating a new version
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { qcChecked } = (await request.json()) as { qcChecked?: boolean };
    const value = qcChecked === true;

    const manifestPath = `${RESULTS_PREFIX}/${id}/manifest.json`;
    const manifest = await fetchBlobByPathname<GameSeoManifest>(manifestPath);

    if (manifest) {
      const updatedManifest: GameSeoManifest = { ...manifest, qcChecked: value };
      const blob = await put(manifestPath, JSON.stringify(updatedManifest), {
        access: "public",
        contentType: "application/json",
        allowOverwrite: true,
      });

      const entries = await readIndex<GameSeoIndexEntry>(
        RESULTS_PREFIX,
        mapBlobToEntry
      );
      const entryIndex = entries.findIndex((e) => e.id === id);
      if (entryIndex !== -1) {
        entries[entryIndex] = {
          ...entries[entryIndex],
          qcChecked: value,
          url: blob.url,
          pathname: blob.pathname,
        };
        await writeIndex(RESULTS_PREFIX, entries);
      }

      return NextResponse.json({ success: true, qcChecked: value });
    }

    // Fallback to old single-blob format.
    const oldPath = `${RESULTS_PREFIX}/${id}.json`;
    const oldBlob = await fetchBlobByPathname<GameSeoResult>(oldPath);
    if (!oldBlob) {
      return NextResponse.json(
        { error: "Result not found" },
        { status: 404 }
      );
    }

    const updatedResult: GameSeoResult = { ...oldBlob, qcChecked: value };
    const blob = await put(oldPath, JSON.stringify(updatedResult), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    const entries = await readIndex<GameSeoIndexEntry>(
      RESULTS_PREFIX,
      mapBlobToEntry
    );
    const entryIndex = entries.findIndex((e) => e.id === id);
    if (entryIndex !== -1) {
      entries[entryIndex] = {
        ...entries[entryIndex],
        qcChecked: value,
        url: blob.url,
        pathname: blob.pathname,
      };
      await writeIndex(RESULTS_PREFIX, entries);
    }

    return NextResponse.json({ success: true, qcChecked: value });
  } catch (error) {
    console.error("Error updating game SEO QC flag:", error);
    return NextResponse.json(
      { error: "Failed to update QC flag" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a result and all its versions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete the manifest and all version snapshots.
    const { blobs } = await list({ prefix: `${RESULTS_PREFIX}/${id}/` });
    await Promise.all(
      blobs.map(async (blob) => {
        try {
          await del(blob.url);
        } catch (e) {
          console.warn(`Failed to delete blob ${blob.url}:`, e);
        }
      })
    );

    // Also delete the legacy single-blob file if it exists.
    try {
      const legacyPath = `${RESULTS_PREFIX}/${id}.json`;
      const legacyList = await list({ prefix: legacyPath });
      const legacyBlob = legacyList.blobs.find((b) => b.pathname === legacyPath);
      if (legacyBlob) {
        await del(legacyBlob.url);
      }
    } catch (e) {
      console.warn(`Failed to delete legacy blob for ${id}:`, e);
    }

    // Update the index
    const entries = await readIndex<GameSeoIndexEntry>(
      RESULTS_PREFIX,
      mapBlobToEntry
    );
    const entryIndex = entries.findIndex((e) => e.id === id);
    if (entryIndex !== -1) {
      entries.splice(entryIndex, 1);
      await writeIndex(RESULTS_PREFIX, entries);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting game SEO result:", error);
    return NextResponse.json(
      { error: "Failed to delete result" },
      { status: 500 }
    );
  }
}
