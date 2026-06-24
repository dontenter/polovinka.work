import { list, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const BLOB_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";
const RESULTS_PREFIX = `${BLOB_PREFIX}/game-seo-results`;

type SeoVersionMeta = {
  versionId: string;
  createdAt: string;
  createdFrom?: string;
  changes: Array<{ field: string; label: string; description: string }>;
};

type GameSeoManifest = {
  id: string;
  gameName: string;
  date: string;
  currentVersionId: string;
  versions: SeoVersionMeta[];
  qcChecked?: boolean;
};

type GameSeoResult = {
  id: string;
  gameName: string;
  controls?: string;
  date: string;
  blocks: unknown[];
  faqGroups: unknown[];
  generatedText: string;
  qcChecked?: boolean;
  versionId?: string;
};

interface BaseBlob {
  pathname: string;
  url: string;
}

async function listAllBlobs(prefix: string): Promise<BaseBlob[]> {
  const all: BaseBlob[] = [];
  let cursor: string | undefined;

  do {
    const response: { blobs: BaseBlob[]; cursor?: string } = await list({
      prefix,
      cursor,
      limit: 1000,
    });
    all.push(...response.blobs);
    cursor = response.cursor;
  } while (cursor);

  return all;
}

function versionIdToDate(versionId: string): string {
  const timestamp = versionId.split("-")[0];
  const time = timestamp ? Number(timestamp) : NaN;
  if (!Number.isNaN(time) && time > 0) {
    return new Date(time).toISOString();
  }
  return new Date().toISOString();
}

// POST /api/game-seo/repair
// Rebuilds index.json. Missing manifest.json are recreated from version
// snapshots, but existing manifest.json are never overwritten.
// Authorization: Bearer LAB_SECRET
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expected = `Bearer ${process.env.LAB_SECRET}`;
    if (!process.env.LAB_SECRET || authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allBlobs = await listAllBlobs(`${RESULTS_PREFIX}/`);
    const escapedPrefix = RESULTS_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Collect existing manifests, versions, and legacy blobs.
    const existingManifests = new Map<string, BaseBlob>();
    const versionsById = new Map<
      string,
      Array<{ pathname: string; url: string; versionId: string }>
    >();
    const legacyBlobs: BaseBlob[] = [];

    for (const blob of allBlobs) {
      if (blob.pathname.endsWith("/index.json")) continue;

      const manifestMatch = blob.pathname.match(
        new RegExp(`^${escapedPrefix}/([^/]+)/manifest\\.json$`)
      );
      if (manifestMatch) {
        existingManifests.set(manifestMatch[1], blob);
        continue;
      }

      const versionMatch = blob.pathname.match(
        new RegExp(`^${escapedPrefix}/([^/]+)/versions/([^/]+)\\.json$`)
      );
      if (versionMatch) {
        const [, id, versionId] = versionMatch;
        if (!versionsById.has(id)) versionsById.set(id, []);
        versionsById
          .get(id)!
          .push({ pathname: blob.pathname, url: blob.url, versionId });
        continue;
      }

      const legacyMatch = blob.pathname.match(
        new RegExp(`^${escapedPrefix}/([^/]+)\\.json$`)
      );
      if (legacyMatch) {
        legacyBlobs.push(blob);
      }
    }

    const indexEntries: Array<{
      id: string;
      gameName: string;
      date: string;
      qcChecked: boolean;
      url: string;
      pathname: string;
    }> = [];
    let createdManifests = 0;
    let reusedManifests = 0;

    // Helper to add an entry from a manifest blob.
    const addEntryFromManifest = async (manifestBlob: BaseBlob) => {
      const response = await fetch(manifestBlob.url);
      if (!response.ok) return false;
      const manifest = (await response.json()) as GameSeoManifest;
      indexEntries.push({
        id: manifest.id,
        gameName: manifest.gameName,
        date: manifest.date,
        qcChecked: manifest.qcChecked === true,
        url: manifestBlob.url,
        pathname: manifestBlob.pathname,
      });
      return true;
    };

    // 1. Reuse existing manifests unchanged.
    for (const [id, manifestBlob] of existingManifests.entries()) {
      const ok = await addEntryFromManifest(manifestBlob);
      if (ok) reusedManifests++;
      // Remove from other collections so we don't recreate it.
      versionsById.delete(id);
    }

    // 2. Create manifests for ids that have version snapshots but no manifest.
    for (const [id, versions] of versionsById.entries()) {
      if (versions.length === 0) continue;

      versions.sort((a, b) => {
        const ta = Number(a.versionId.split("-")[0]) || 0;
        const tb = Number(b.versionId.split("-")[0]) || 0;
        return tb - ta;
      });

      const latest = versions[0];
      const snapshotResponse = await fetch(latest.url);
      if (!snapshotResponse.ok) {
        console.warn(`Failed to fetch snapshot ${latest.url}`);
        continue;
      }
      const snapshot = (await snapshotResponse.json()) as GameSeoResult;

      const manifestVersions: SeoVersionMeta[] = versions.map((v) => ({
        versionId: v.versionId,
        createdAt: versionIdToDate(v.versionId),
        changes: [
          {
            field: "none",
            label: "Восстановлено",
            description: "Версия восстановлена из хранилища",
          },
        ],
      }));

      const manifest: GameSeoManifest = {
        id,
        gameName: snapshot.gameName || id,
        date: snapshot.date || versionIdToDate(latest.versionId),
        currentVersionId: latest.versionId,
        versions: manifestVersions,
        qcChecked: snapshot.qcChecked === true,
      };

      const manifestBlob = await put(
        `${RESULTS_PREFIX}/${id}/manifest.json`,
        JSON.stringify(manifest),
        {
          access: "public",
          contentType: "application/json",
          allowOverwrite: true,
        }
      );

      indexEntries.push({
        id,
        gameName: manifest.gameName,
        date: manifest.date,
        qcChecked: manifest.qcChecked ?? false,
        url: manifestBlob.url,
        pathname: manifestBlob.pathname,
      });
      createdManifests++;
    }

    // 3. Convert legacy single-blob results only if no manifest/version exists.
    let createdLegacy = 0;
    for (const legacy of legacyBlobs) {
      const match = legacy.pathname.match(
        new RegExp(`^${escapedPrefix}/([^/]+)\\.json$`)
      );
      if (!match) continue;
      const id = match[1];

      if (existingManifests.has(id) || versionsById.has(id)) continue;

      const snapshotResponse = await fetch(legacy.url);
      if (!snapshotResponse.ok) continue;
      const snapshot = (await snapshotResponse.json()) as GameSeoResult;

      const legacyVersionId = `legacy-${snapshot.date || Date.now()}`;

      await put(
        `${RESULTS_PREFIX}/${id}/versions/${legacyVersionId}.json`,
        JSON.stringify({ ...snapshot, versionId: legacyVersionId }),
        {
          access: "public",
          contentType: "application/json",
        }
      );

      const manifest: GameSeoManifest = {
        id,
        gameName: snapshot.gameName || id,
        date: snapshot.date || new Date().toISOString(),
        currentVersionId: legacyVersionId,
        versions: [
          {
            versionId: legacyVersionId,
            createdAt: snapshot.date || new Date().toISOString(),
            changes: [
              {
                field: "none",
                label: "Первоначальная версия",
                description: "Сохранено до появления версионирования",
              },
            ],
          },
        ],
        qcChecked: snapshot.qcChecked === true,
      };

      const manifestBlob = await put(
        `${RESULTS_PREFIX}/${id}/manifest.json`,
        JSON.stringify(manifest),
        {
          access: "public",
          contentType: "application/json",
          allowOverwrite: true,
        }
      );

      indexEntries.push({
        id,
        gameName: manifest.gameName,
        date: manifest.date,
        qcChecked: manifest.qcChecked ?? false,
        url: manifestBlob.url,
        pathname: manifestBlob.pathname,
      });
      createdLegacy++;
      createdManifests++;
    }

    // 4. Write the index.
    indexEntries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    await put(`${RESULTS_PREFIX}/index.json`, JSON.stringify(indexEntries), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    return NextResponse.json({
      success: true,
      totalInIndex: indexEntries.length,
      reusedManifests,
      createdManifests,
      createdLegacy,
    });
  } catch (error) {
    console.error("Error repairing game SEO index:", error);
    return NextResponse.json(
      {
        error: "Failed to repair index",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
