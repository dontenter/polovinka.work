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

export type GameSeoResult = {
  id: string;
  gameName: string;
  date: string;
  blocks: SeoBlock[];
  faqGroups: FaqGroup[];
  generatedText: string;
};

export async function saveGameSeoResult(result: GameSeoResult): Promise<void> {
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
}

export interface PaginatedResults {
  results: GameSeoResult[];
  total: number;
  page: number;
  limit: number;
}

export async function getAllGameSeoResults(): Promise<GameSeoResult[]> {
  const response = await fetch("/api/game-seo");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch results");
  }

  const data = await response.json();
  return data.results || [];
}

export async function getGameSeoResults(
  page: number,
  limit: number,
  search?: string
): Promise<PaginatedResults> {
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

export async function getGameSeoResultById(id: string): Promise<GameSeoResult | null> {
  const response = await fetch(`/api/game-seo/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch result");
  }

  return await response.json();
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
