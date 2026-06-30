// Storage utility for game SEO text results - now using Vercel Blob via API

export type SeoBlockItem = {
  name: string;
  detail: string;
  advanced?: boolean; // for Tips & Tricks
  best?: boolean; // for Weapons / Gear / Items
};

export type SeoBlock = {
  id: string;
  label: string; // English label for serialization
  labelRu: string; // Russian label for UI
  description?: string; // helper text for editor
  customLabel?: string; // editor override (English, for serialization)
  items: SeoBlockItem[];
  meta?: {
    count?: string; // for Levels block
    structure?: string; // for Levels block
    variant?: string; // for Levels/Weapons label variants
  };
};

export type FaqItem = {
  question: string;
  answer: string;
  confirmed?: boolean; // user confirmed the Q&A pair
};

export type FaqGroup = {
  id: string;
  labelRu: string; // UI label in Russian
  labelEn: string; // serialized English label
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

// Lightweight shape returned by the paginated list endpoint.
export type GameSeoListItem = {
  id: string;
  gameName: string;
  date: string;
  qcChecked?: boolean;
  hasFullSeoBefore?: boolean;
  hasFullSeoAfter?: boolean;
};

export type SaveGameSeoResultResponse = {
  success: boolean;
  id: string;
  versionId: string;
  date: string;
};

export type GameSeoVersionsResponse = {
  id: string;
  gameName: string;
  date: string;
  currentVersionId: string;
  versions: SeoVersionMeta[];
};

export async function saveGameSeoResult(
  result: GameSeoResult
): Promise<SaveGameSeoResultResponse> {
  const response = await fetch("/api/game-seo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    let errorMessage = "Failed to save result";
    try {
      const error = await response.json();
      errorMessage = error.error || error.details || JSON.stringify(error);
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as SaveGameSeoResultResponse;
}

export interface PaginatedResults<T = GameSeoResult> {
  results: T[];
  total: number;
  page: number;
  limit: number;
}

export async function getGameSeoResults(
  page: number,
  limit: number,
  search?: string
): Promise<PaginatedResults<GameSeoListItem>> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search) params.set("search", search);

  const response = await fetch(`/api/game-seo?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch results");
  }

  return await response.json();
}

export async function getGameSeoResultById(
  id: string,
  versionId?: string
): Promise<GameSeoResult | null> {
  const params = new URLSearchParams();
  if (versionId) params.set("versionId", versionId);

  const query = params.toString();
  const response = await fetch(`/api/game-seo/${id}${query ? `?${query}` : ""}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch result");
  }

  return await response.json();
}

export async function getGameSeoVersions(
  id: string
): Promise<GameSeoVersionsResponse | null> {
  const response = await fetch(`/api/game-seo/${id}/versions`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch versions");
  }

  return await response.json();
}

export async function updateGameSeoQcChecked(
  id: string,
  qcChecked: boolean
): Promise<void> {
  const response = await fetch(`/api/game-seo/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qcChecked }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update QC flag");
  }
}

export async function updateGameSeoFullSeo(
  id: string,
  fullSeoBefore?: string,
  fullSeoAfter?: string
): Promise<void> {
  const response = await fetch(`/api/game-seo/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullSeoBefore, fullSeoAfter }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update Full SEO fields");
  }
}

export async function deleteGameSeoResult(id: string): Promise<void> {
  const response = await fetch(`/api/game-seo/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete result");
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
