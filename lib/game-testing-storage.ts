// Storage utility for game testing results - now using Vercel Blob via API

export type GameTestResult = {
  id: string;
  gameName: string;
  date: string;
  // Basic checks
  basicChecks: Record<string, boolean>;
  // Feature checks
  features: {
    id: string;
    name: string;
    applicable: boolean;
    checkedItems: string[];
  }[];
  // Rating criteria
  ratingCriteria: {
    id: string;
    label: string;
    weight: number;
    checked: boolean;
  }[];
  // Calculated rating
  ratingScore: number;
  ratingRawScore: number;
  // Detailed answers (for high-rated games)
  detailedAnswers: Record<string, string>;
  // Generated description
  generatedDescription?: string;
  // Failed basic checks flag
  hasFailedBasicChecks: boolean;
};

export async function saveGameTestResult(
  result: GameTestResult
): Promise<void> {
  const response = await fetch("/api/game-testing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save result");
  }
}

export async function getAllGameTestResults(): Promise<GameTestResult[]> {
  const response = await fetch("/api/game-testing");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch results");
  }

  const data = await response.json();
  return data.results || [];
}

export async function getGameTestResultById(
  id: string
): Promise<GameTestResult | null> {
  const response = await fetch(`/api/game-testing/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch result");
  }

  return await response.json();
}

export async function deleteGameTestResult(id: string): Promise<void> {
  const response = await fetch(`/api/game-testing/${id}`, {
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
