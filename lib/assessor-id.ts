// Playgama uses legacy 10-character and current 14-character game IDs.
export function isAssessorGameId(value: string): boolean {
  return /^(?:[a-z0-9]{10}|[a-z0-9]{14})$/.test(value);
}
