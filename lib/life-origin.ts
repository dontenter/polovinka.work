/** Compare against the browser-facing Host, not Next's internal proxy URL. */
export function lifeRequestOrigin(headers: Headers): string | null {
  try {
    const origin = new URL(headers.get("origin") ?? "");
    if (!["http:", "https:"].includes(origin.protocol) || origin.host !== headers.get("host")) return null;
    return origin.origin;
  } catch { return null; }
}
