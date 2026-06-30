import { put, del, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  readIndex,
  writeIndex,
  type BaseIndexEntry,
} from "@/lib/blob-index";

const BLOB_PREFIX = process.env.NODE_ENV === "production" ? "prod" : "dev";
const RESULTS_PREFIX = `${BLOB_PREFIX}/game-seo-results`;

interface GameSeoIndexEntry extends BaseIndexEntry {
  qcChecked?: boolean;
  hasFullSeoBefore?: boolean;
  hasFullSeoAfter?: boolean;
}

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

export type SeoVersionChange = {
  field: string;
  label: string;
  description: string;
};

export type SeoVersionMeta = {
  versionId: string;
  createdAt: string;
  createdFrom?: string;
  changes: SeoVersionChange[];
};

export type GameSeoResult = {
  id: string;
  gameName: string;
  controls?: string;
  date: string;
  blocks: SeoBlock[];
  faqGroups: FaqGroup[];
  generatedText: string;
  qcChecked?: boolean;
  fullSeoBefore?: string;
  fullSeoAfter?: string;
  versionId?: string;
  versions?: SeoVersionMeta[];
  currentVersionId?: string;
};

export type GameSeoManifest = {
  id: string;
  gameName: string;
  date: string;
  currentVersionId: string;
  versions: SeoVersionMeta[];
  qcChecked?: boolean;
  fullSeoBefore?: string;
  fullSeoAfter?: string;
};

function mapBlobToEntry(
  data: unknown,
  blob: { url: string; pathname: string }
): GameSeoIndexEntry | null {
  if (!data || typeof data !== "object") return null;
  const result = data as GameSeoResult | GameSeoManifest;
  if (!result.id || !result.gameName || !result.date) return null;

  // Version snapshots are not list-level results.
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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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

function isEmptyAnswer(value: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return (
    trimmed === "" ||
    trimmed === "-" ||
    trimmed.toLowerCase() === "неприменимо" ||
    trimmed.toLowerCase() === "нет информации"
  );
}

function validBlockItems(block: SeoBlock): SeoBlockItem[] {
  return block.items.filter((item) => {
    const nameOk = !isEmptyAnswer(item.name);
    const detailOk = !isEmptyAnswer(item.detail);
    return nameOk || detailOk;
  });
}

function validFaqItems(group: FaqGroup): FaqItem[] {
  return group.items.filter(
    (item) =>
      item.confirmed &&
      !isEmptyAnswer(item.question) &&
      !isEmptyAnswer(item.answer)
  );
}

function blockContentFingerprint(block: SeoBlock): string {
  const parts: string[] = [];
  if (block.customLabel?.trim()) {
    parts.push(`label:${block.customLabel.trim()}`);
  }
  if (block.meta?.count?.trim()) {
    parts.push(`count:${block.meta.count.trim()}`);
  }
  if (block.meta?.variant?.trim()) {
    parts.push(`variant:${block.meta.variant.trim()}`);
  }
  if (!isEmptyAnswer(block.meta?.structure || "")) {
    parts.push(`structure:${block.meta!.structure!.trim()}`);
  }
  for (const item of validBlockItems(block)) {
    parts.push(
      `item:${item.name.trim()}|${item.detail.trim()}|advanced:${Boolean(
        item.advanced
      )}|best:${Boolean(item.best)}`
    );
  }
  return parts.join(";;");
}

function blockHasContent(block: SeoBlock): boolean {
  return blockContentFingerprint(block) !== "";
}

function faqFingerprint(group: FaqGroup): string {
  const items = validFaqItems(group);
  return items
    .map((item) => `${item.question.trim()}|${item.answer.trim()}`)
    .sort()
    .join(";;");
}

function summarizeChanges(
  prev: GameSeoResult,
  next: GameSeoResult
): SeoVersionChange[] {
  const changes: SeoVersionChange[] = [];

  if (prev.gameName !== next.gameName) {
    changes.push({
      field: "gameName",
      label: "Название игры",
      description: `${prev.gameName} → ${next.gameName}`,
    });
  }

  if ((prev.controls || "") !== (next.controls || "")) {
    changes.push({
      field: "controls",
      label: "Управление",
      description: "Изменено описание управления",
    });
  }

  if (prev.generatedText !== next.generatedText) {
    changes.push({
      field: "generatedText",
      label: "Сгенерированный текст",
      description: "Текст перегенерирован или отредактирован",
    });
  }

  if ((prev.fullSeoBefore || "") !== (next.fullSeoBefore || "")) {
    changes.push({
      field: "fullSeoBefore",
      label: "Full SEO Before",
      description: next.fullSeoBefore?.trim()
        ? "Добавлен или изменён"
        : "Удалён",
    });
  }

  if ((prev.fullSeoAfter || "") !== (next.fullSeoAfter || "")) {
    changes.push({
      field: "fullSeoAfter",
      label: "Full SEO After",
      description: next.fullSeoAfter?.trim()
        ? "Добавлен или изменён"
        : "Удалён",
    });
  }

  const prevBlocks = new Map(prev.blocks.map((b) => [b.id, b]));
  const nextBlocks = new Map(next.blocks.map((b) => [b.id, b]));

  for (const [id, nextBlock] of nextBlocks) {
    const prevBlock = prevBlocks.get(id);
    const hadContent = prevBlock ? blockHasContent(prevBlock) : false;
    const hasContent = blockHasContent(nextBlock);

    if (!prevBlock && hasContent) {
      changes.push({
        field: "block",
        label: `Блок «${nextBlock.labelRu}»`,
        description: "Добавлен новый блок",
      });
    } else if (prevBlock && !hadContent && hasContent) {
      changes.push({
        field: "block",
        label: `Блок «${nextBlock.labelRu}»`,
        description: "Добавлено содержимое",
      });
    } else if (prevBlock && hadContent && !hasContent) {
      changes.push({
        field: "block",
        label: `Блок «${nextBlock.labelRu}»`,
        description: "Содержимое удалено",
      });
    } else if (prevBlock && hadContent && hasContent) {
      const prevFp = blockContentFingerprint(prevBlock);
      const nextFp = blockContentFingerprint(nextBlock);
      if (prevFp !== nextFp) {
        changes.push({
          field: "block",
          label: `Блок «${nextBlock.labelRu}»`,
          description: "Изменено содержимое",
        });
      }
    }
  }

  for (const [id, prevBlock] of prevBlocks) {
    if (!nextBlocks.has(id) && blockHasContent(prevBlock)) {
      changes.push({
        field: "block",
        label: `Блок «${prevBlock.labelRu}»`,
        description: "Блок удалён",
      });
    }
  }

  const prevFaq = new Map(prev.faqGroups.map((g) => [g.id, g]));
  const nextFaq = new Map(next.faqGroups.map((g) => [g.id, g]));

  for (const [id, nextGroup] of nextFaq) {
    const prevGroup = prevFaq.get(id);
    const prevCount = prevGroup ? validFaqItems(prevGroup).length : 0;
    const nextCount = validFaqItems(nextGroup).length;

    if (!prevGroup && nextCount > 0) {
      changes.push({
        field: "faq",
        label: `FAQ: ${nextGroup.labelRu}`,
        description: `Добавлено ${nextCount} вопросов`,
      });
    } else if (prevGroup) {
      if (nextCount > prevCount) {
        changes.push({
          field: "faq",
          label: `FAQ: ${nextGroup.labelRu}`,
          description: `Добавлено ${nextCount - prevCount} вопросов`,
        });
      } else if (nextCount < prevCount) {
        changes.push({
          field: "faq",
          label: `FAQ: ${nextGroup.labelRu}`,
          description: `Удалено ${prevCount - nextCount} вопросов`,
        });
      } else if (
        nextCount > 0 &&
        nextCount === prevCount &&
        faqFingerprint(prevGroup) !== faqFingerprint(nextGroup)
      ) {
        changes.push({
          field: "faq",
          label: `FAQ: ${nextGroup.labelRu}`,
          description: "Изменены ответы",
        });
      }
    }
  }

  for (const [id, prevGroup] of prevFaq) {
    if (!nextFaq.has(id) && validFaqItems(prevGroup).length > 0) {
      changes.push({
        field: "faq",
        label: `FAQ: ${prevGroup.labelRu}`,
        description: "Группа удалена",
      });
    }
  }

  if (changes.length === 0) {
    changes.push({
      field: "none",
      label: "Сохранено",
      description: "Изменений не обнаружено",
    });
  }

  return changes;
}

// POST - Save a new version of a result
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as GameSeoResult;
    const {
      id,
      gameName,
      controls,
      blocks,
      faqGroups,
      generatedText,
      fullSeoBefore: payloadFullSeoBefore,
      fullSeoAfter: payloadFullSeoAfter,
    } = payload;

    if (!id || !gameName) {
      console.error("Missing required fields:", { id, gameName });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newDate = new Date().toISOString();
    const newVersionId = generateId();

    const manifestPath = `${RESULTS_PREFIX}/${id}/manifest.json`;
    const versionsDir = `${RESULTS_PREFIX}/${id}/versions`;

    let manifest: GameSeoManifest | null = await fetchBlobByPathname(
      manifestPath
    );
    let previousSnapshot: GameSeoResult | null = null;
    let createdFrom: string | undefined;
    let versions: SeoVersionMeta[] = manifest?.versions ?? [];
    let oldBlobPathToDelete: string | null = null;

    if (manifest) {
      createdFrom = manifest.currentVersionId;
      previousSnapshot = await fetchBlobByPathname<GameSeoResult>(
        `${versionsDir}/${manifest.currentVersionId}.json`
      );
    } else {
      // Backwards compatibility: check for the old single-blob format.
      const oldBlobPath = `${RESULTS_PREFIX}/${id}.json`;
      const oldSnapshot = await fetchBlobByPathname<GameSeoResult>(oldBlobPath);
      if (oldSnapshot) {
        previousSnapshot = oldSnapshot;
        const legacyVersionId = `legacy-${Date.now()}`;
        const legacySnapshot: GameSeoResult = {
          ...oldSnapshot,
          versionId: legacyVersionId,
        };

        await put(`${versionsDir}/${legacyVersionId}.json`, JSON.stringify(legacySnapshot), {
          access: "public",
          contentType: "application/json",
        });

        versions = [
          {
            versionId: legacyVersionId,
            createdAt: oldSnapshot.date || newDate,
            changes: [
              {
                field: "none",
                label: "Первоначальная версия",
                description: "Сохранено из старого формата",
              },
            ],
          },
        ];
        createdFrom = legacyVersionId;
        oldBlobPathToDelete = oldBlobPath;
      }
    }

    const previousQc = manifest?.qcChecked ?? previousSnapshot?.qcChecked ?? false;

    // Preserve existing Full SEO fields when an editor save doesn't send them.
    const fullSeoBefore =
      payloadFullSeoBefore ?? previousSnapshot?.fullSeoBefore;
    const fullSeoAfter = payloadFullSeoAfter ?? previousSnapshot?.fullSeoAfter;

    const draftSnapshot: GameSeoResult = {
      id,
      gameName: gameName.trim(),
      controls: controls?.trim(),
      date: newDate,
      blocks,
      faqGroups,
      generatedText,
      qcChecked: previousQc,
      fullSeoBefore: fullSeoBefore?.trim(),
      fullSeoAfter: fullSeoAfter?.trim(),
      versionId: newVersionId,
    };

    const changes = previousSnapshot
      ? summarizeChanges(previousSnapshot, draftSnapshot)
      : [
          {
            field: "new",
            label: "Создано",
            description: "Первоначальная версия",
          },
        ];

    const hasRealChanges = !(
      changes.length === 1 &&
      (changes[0].field === "none" || changes[0].field === "new")
    );

    const qcChecked = hasRealChanges
      ? false
      : (payload.qcChecked ?? previousQc);

    const newSnapshot: GameSeoResult = {
      ...draftSnapshot,
      qcChecked,
    };

    versions.push({
      versionId: newVersionId,
      createdAt: newDate,
      createdFrom,
      changes,
    });

    const newManifest: GameSeoManifest = {
      id,
      gameName: gameName.trim(),
      date: newDate,
      currentVersionId: newVersionId,
      versions,
      qcChecked,
      fullSeoBefore: fullSeoBefore?.trim(),
      fullSeoAfter: fullSeoAfter?.trim(),
    };

    const versionBlob = await put(
      `${versionsDir}/${newVersionId}.json`,
      JSON.stringify(newSnapshot),
      {
        access: "public",
        contentType: "application/json",
      }
    );

    const manifestBlob = await put(
      manifestPath,
      JSON.stringify(newManifest),
      {
        access: "public",
        contentType: "application/json",
        allowOverwrite: true,
      }
    );

    if (oldBlobPathToDelete) {
      try {
        const { blobs } = await list({ prefix: oldBlobPathToDelete });
        const oldBlob = blobs.find((b) => b.pathname === oldBlobPathToDelete);
        if (oldBlob) {
          await del(oldBlob.url);
        }
      } catch (e) {
        console.warn(`Failed to delete old-format blob ${oldBlobPathToDelete}`, e);
      }
    }

    // Update the lightweight index
    const entries = await readIndex<GameSeoIndexEntry>(RESULTS_PREFIX, mapBlobToEntry);
    const existingIndex = entries.findIndex((e) => e.id === id);
    const entry: GameSeoIndexEntry = {
      id,
      gameName: gameName.trim(),
      date: newDate,
      qcChecked,
      hasFullSeoBefore:
        typeof fullSeoBefore === "string" && fullSeoBefore.trim() !== "",
      hasFullSeoAfter:
        typeof fullSeoAfter === "string" && fullSeoAfter.trim() !== "",
      url: manifestBlob.url,
      pathname: manifestBlob.pathname,
    };

    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }

    await writeIndex(RESULTS_PREFIX, entries);

    return NextResponse.json({
      success: true,
      id,
      versionId: newVersionId,
      date: newDate,
      versionUrl: versionBlob.url,
      manifestUrl: manifestBlob.url,
    });
  } catch (error) {
    console.error("Error saving game SEO result:", error);
    return NextResponse.json(
      {
        error: "Failed to save result",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET - List results with pagination and optional search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "25", 10))
    );
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    const entries = await readIndex<GameSeoIndexEntry>(
      RESULTS_PREFIX,
      mapBlobToEntry
    );

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
    console.error("Error listing game SEO results:", error);
    return NextResponse.json(
      { error: "Failed to list results" },
      { status: 500 }
    );
  }
}
