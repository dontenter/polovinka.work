// Storage utility for game testing results

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

const STORAGE_KEY = "game-testing-results";

export function saveGameTestResult(result: GameTestResult): void {
  const existing = getAllGameTestResults();
  const updated = [result, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getAllGameTestResults(): GameTestResult[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function getGameTestResultById(id: string): GameTestResult | null {
  const results = getAllGameTestResults();
  return results.find((r) => r.id === id) || null;
}

export function deleteGameTestResult(id: string): void {
  const existing = getAllGameTestResults();
  const filtered = existing.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
