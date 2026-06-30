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
  hasFullSeoBefore?: boolean;
  hasFullSeoAfter?: boolean;
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
    hasFullSeoBefore:
      typeof (result as GameSeoManifest).fullSeoBefore === "string" &&
      (result as GameSeoManifest).fullSeoBefore!.trim() !== "",
    hasFullSeoAfter:
      typeof (result as GameSeoManifest).fullSeoAfter === "string" &&
      (result as GameSeoManifest).fullSeoAfter!.trim() !== "",
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
        fullSeoBefore: manifest.fullSeoBefore,
        fullSeoAfter: manifest.fullSeoAfter,
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

// PATCH - Update lightweight fields (QC flag, Full SEO Before/After)
// without creating a new version.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = (await request.json()) as {
      qcChecked?: boolean;
      fullSeoBefore?: string;
      fullSeoAfter?: string;
    };

    const qcCheckedValue =
      typeof payload.qcChecked === "boolean" ? payload.qcChecked : undefined;
    const fullSeoBeforeValue =
      typeof payload.fullSeoBefore === "string"
        ? payload.fullSeoBefore.trim() || undefined
        : undefined;
    const fullSeoAfterValue =
      typeof payload.fullSeoAfter === "string"
        ? payload.fullSeoAfter.trim() || undefined
        : undefined;

    const manifestPath = `${RESULTS_PREFIX}/${id}/manifest.json`;
    const manifest = await fetchBlobByPathname<GameSeoManifest>(manifestPath);

    if (manifest) {
      const updatedManifest: GameSeoManifest = {
        ...manifest,
        ...(qcCheckedValue !== undefined && { qcChecked: qcCheckedValue }),
        ...(typeof payload.fullSeoBefore === "string" && {
          fullSeoBefore: fullSeoBeforeValue,
        }),
        ...(typeof payload.fullSeoAfter === "string" && {
          fullSeoAfter: fullSeoAfterValue,
        }),
      };

      // Keep the current version snapshot in sync so GET returns consistent data.
      const snapshotPath = `${RESULTS_PREFIX}/${id}/versions/${manifest.currentVersionId}.json`;
      const snapshot = await fetchBlobByPathname<GameSeoResult>(snapshotPath);
      if (snapshot) {
        const updatedSnapshot: GameSeoResult = {
          ...snapshot,
          ...(qcCheckedValue !== undefined && { qcChecked: qcCheckedValue }),
          ...(typeof payload.fullSeoBefore === "string" && {
            fullSeoBefore: fullSeoBeforeValue,
          }),
          ...(typeof payload.fullSeoAfter === "string" && {
            fullSeoAfter: fullSeoAfterValue,
          }),
        };
        await put(snapshotPath, JSON.stringify(updatedSnapshot), {
          access: "public",
          contentType: "application/json",
          allowOverwrite: true,
        });
      }

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
          ...(qcCheckedValue !== undefined && { qcChecked: qcCheckedValue }),
          url: blob.url,
          pathname: blob.pathname,
          hasFullSeoBefore:
            typeof updatedManifest.fullSeoBefore === "string" &&
            updatedManifest.fullSeoBefore.trim() !== "",
          hasFullSeoAfter:
            typeof updatedManifest.fullSeoAfter === "string" &&
            updatedManifest.fullSeoAfter.trim() !== "",
        };
        await writeIndex(RESULTS_PREFIX, entries);
      }

      return NextResponse.json({
        success: true,
        qcChecked: updatedManifest.qcChecked,
        fullSeoBefore: updatedManifest.fullSeoBefore,
        fullSeoAfter: updatedManifest.fullSeoAfter,
      });
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

    const updatedResult: GameSeoResult = {
      ...oldBlob,
      ...(qcCheckedValue !== undefined && { qcChecked: qcCheckedValue }),
      ...(typeof payload.fullSeoBefore === "string" && {
        fullSeoBefore: fullSeoBeforeValue,
      }),
      ...(typeof payload.fullSeoAfter === "string" && {
        fullSeoAfter: fullSeoAfterValue,
      }),
    };
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
        ...(qcCheckedValue !== undefined && { qcChecked: qcCheckedValue }),
        url: blob.url,
        pathname: blob.pathname,
        hasFullSeoBefore:
          typeof updatedResult.fullSeoBefore === "string" &&
          updatedResult.fullSeoBefore.trim() !== "",
        hasFullSeoAfter:
          typeof updatedResult.fullSeoAfter === "string" &&
          updatedResult.fullSeoAfter.trim() !== "",
      };
      await writeIndex(RESULTS_PREFIX, entries);
    }

    return NextResponse.json({
      success: true,
      qcChecked: updatedResult.qcChecked,
      fullSeoBefore: updatedResult.fullSeoBefore,
      fullSeoAfter: updatedResult.fullSeoAfter,
    });
  } catch (error) {
    console.error("Error updating game SEO fields:", error);
    return NextResponse.json(
      { error: "Failed to update fields" },
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
