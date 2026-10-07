import "server-only";
import { getSyncState, insertGames, saveSyncState, type ImportedGame } from "@/lib/assessor-storage";

const CATALOG = "https://playgama.ai/play";
const PAGE_LIMIT = 25;
const BACKFILL_PAGES = 5;

function decodeHtml(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " } as Record<string, string>)[entity.toLowerCase()] ?? match;
  });
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? decodeHtml(match[1]) : null;
}

function cursorDate(url: string | null): string | null {
  if (!url) return null;
  const cursor = new URL(url, CATALOG).searchParams.get("cursor");
  if (!cursor) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!value || typeof value !== "object") return null;
    const date = (value as { publishedAt?: unknown }).publishedAt;
    return typeof date === "string" && Number.isFinite(Date.parse(date)) ? date : null;
  } catch { return null; }
}

function parseCatalog(html: string, pageUrl: string): { games: ImportedGame[]; next: string | null } {
  const games: ImportedGame[] = [];
  const more = html.match(/<a\b[^>]*\bdata-game-next(?:="")?[^>]*>/)?.[0];
  const nextHref = more ? attribute(more, "href") : null;
  const nextUrl = nextHref ? new URL(nextHref, CATALOG) : null;
  if (nextUrl && (nextUrl.origin !== "https://playgama.ai" || nextUrl.pathname !== "/play" || !nextUrl.searchParams.has("cursor"))) {
    throw new Error("Unexpected catalog pagination URL");
  }
  // Older catalog cards omit their own timestamp. The page cursor gives a date bound.
  const fallbackDate = cursorDate(nextUrl?.toString() ?? null) ?? cursorDate(pageUrl);
  const cards = html.matchAll(/<a\b([^>]*\bclass="[^"]*\bcard\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/g);
  for (const match of cards) {
    const href = attribute(match[1], "href");
    const id = attribute(match[1], "data-site-id");
    const title = match[2].match(/<span\b[^>]*class="[^"]*\bcard__title\b[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1];
    const timeTag = match[2].match(/<time\b[^>]*>/)?.[0];
    const published = (timeTag ? attribute(timeTag, "datetime") : null) ?? fallbackDate;
    const cover = match[2].match(/<image\b[^>]*class="[^"]*\bcard__cover\b[^"]*"[^>]*>/)?.[0];
    if (!id || !/^[a-z0-9]{10}$/.test(id) || href !== `/play/${id}` || !title || !published || !Number.isFinite(Date.parse(published))) continue;
    const coverUrl = cover ? attribute(cover, "href") : null;
    games.push({ id, title: decodeHtml(title.replace(/<[^>]+>/g, "")).trim(), published_at: published,
      game_url: `${CATALOG}/${id}`, launch_url: null,
      cover_url: coverUrl?.startsWith("https://static.playgama.com/") ? coverUrl : null });
  }
  if (!games.length) throw new Error("Playgama catalog cards were not found");
  return { games, next: nextUrl?.toString() ?? null };
}

async function fetchHtml(url: string): Promise<string> {
  const target = new URL(url);
  if (target.origin !== "https://playgama.ai" || !/^\/play(?:\/[a-z0-9]{10})?$/.test(target.pathname)) {
    throw new Error("Unexpected Playgama URL");
  }
  const response = await fetch(url, { cache: "no-store", headers: { "User-Agent": "polovinka.work assessor importer" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Playgama returned ${response.status}`);
  return response.text();
}

export async function resolveLaunchUrl(id: string): Promise<string> {
  if (!/^[a-z0-9]{10}$/.test(id)) throw new Error("Invalid game ID");
  const html = await fetchHtml(`${CATALOG}/${id}`);
  const frame = html.match(/<iframe\b[^>]*\bclass="[^"]*\bgame-frame\b[^"]*"[^>]*>/)?.[0];
  const raw = frame ? attribute(frame, "data-game-url") ?? attribute(frame, "src") : null;
  if (!raw) throw new Error("Playgama game frame was not found");
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.hostname !== `sb-${id}.games.playgama.net`) {
    throw new Error("Unexpected game frame URL");
  }
  // The Playgama page adds sandbox query parameters for its own origin.
  // Its bare data-game-url is the playable iframe URL on another site.
  url.search = "";
  return url.toString();
}

async function withLaunchUrl(game: ImportedGame): Promise<ImportedGame> {
  try { return { ...game, launch_url: await resolveLaunchUrl(game.id) }; }
  catch { return game; }
}

async function insertPage(games: ImportedGame[]): Promise<void> {
  for (let start = 0; start < games.length; start += 5) {
    await insertGames(await Promise.all(games.slice(start, start + 5).map(withLaunchUrl)));
  }
}

export async function syncAssessorGames(claimedAt: string): Promise<{ added: number; scanned: number; backfillDone: boolean }> {
  const state = await getSyncState();
  let added = 0;
  let scanned = 0;
  let newestId: string | null = null;
  let next: string | null = CATALOG;
  let initialNext: string | null = null;
  let reachedPrevious = false;

  for (let page = 0; page < PAGE_LIMIT && next; page++) {
    const parsed = parseCatalog(await fetchHtml(next), next);
    if (page === 0) { newestId = parsed.games[0].id; initialNext = parsed.next; }
    const stop = state?.newest_id ? parsed.games.findIndex(game => game.id === state.newest_id) : -1;
    const newGames = stop >= 0 ? parsed.games.slice(0, stop) : parsed.games;
    await insertPage(newGames);
    added += newGames.length;
    scanned += parsed.games.length;
    if (!state?.newest_id || stop >= 0 || !parsed.next) { reachedPrevious = true; break; }
    next = parsed.next;
  }
  if (!reachedPrevious) throw new Error(`Previous catalog checkpoint not reached after ${PAGE_LIMIT} pages`);

  let backfillCursor = state?.newest_id ? state.backfill_cursor : initialNext;
  let backfillDone = state?.newest_id ? state.backfill_done : !initialNext;
  if (!backfillDone && backfillCursor) {
    for (let page = 0; page < BACKFILL_PAGES && backfillCursor; page++) {
      const parsed = parseCatalog(await fetchHtml(backfillCursor), backfillCursor);
      await insertPage(parsed.games);
      added += parsed.games.length;
      scanned += parsed.games.length;
      backfillCursor = parsed.next;
    }
    if (!backfillCursor) backfillDone = true;
  }
  await saveSyncState({ newest_id: newestId, backfill_cursor: backfillCursor, backfill_done: backfillDone }, claimedAt);
  return { added, scanned, backfillDone };
}
