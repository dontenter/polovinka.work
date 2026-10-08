import "server-only";

export type AssessorStatus = "pending" | "clear" | "flagged" | "unavailable";
export type AssessorListStatus = AssessorStatus | "favourites";
export type AssessorGame = {
  id: string;
  title: string;
  published_at: string;
  game_url: string;
  launch_url: string | null;
  cover_url: string | null;
  first_seen_at: string;
  status: AssessorStatus;
  reason: string | null;
  reviewed_at: string | null;
  is_favourite: boolean;
};
export type ImportedGame = Pick<AssessorGame, "id" | "title" | "published_at" | "game_url" | "launch_url" | "cover_url">;
export type SyncState = { id: 1; newest_id: string | null; backfill_cursor: string | null; backfill_done: boolean; updated_at: string };
export type SyncClaim = { claimedAt: string; previousUpdatedAt: string };
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

function credentials() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return { url: url.replace(/\/$/, ""), key };
}

async function db(table: string, query = "", init: RequestInit = {}): Promise<Response> {
  const { url, key } = credentials();
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    ...init,
    headers: { ...headers, ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Assessor database request failed (${response.status}): ${await response.text()}`);
  return response;
}

export async function listGames(status: AssessorListStatus, search: string, page: number) {
  const params = new URLSearchParams({ select: "*", status: status === "favourites" ? "neq.pending" : `eq.${status}`, order: status === "pending" ? "published_at.desc" : "reviewed_at.desc", limit: "30", offset: String((page - 1) * 30) });
  if (status === "favourites") params.set("is_favourite", "eq.true");
  if (search) params.set("title", `ilike.*${search.replace(/[*,()]/g, "").slice(0, 100)}*`);
  const response = await db("assessor_games", `?${params}`, { headers: { Prefer: "count=exact" } });
  const games: AssessorGame[] = await response.json();
  const range = response.headers.get("content-range") ?? "";
  const total = Number(range.split("/")[1]) || games.length;
  return { games, total };
}

export async function getGame(id: string): Promise<AssessorGame | null> {
  const rows: AssessorGame[] = await (await db("assessor_games", `?id=eq.${id}&select=*&limit=1`)).json();
  return rows[0] ?? null;
}

export async function reviewGame(id: string, status: AssessorStatus, reason: string): Promise<void> {
  await db("assessor_games", `?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status, reason: reason || null, reviewed_at: status === "pending" ? null : new Date().toISOString() }) });
}

export async function setGameFavourite(id: string, favourite: boolean): Promise<void> {
  await db("assessor_games", `?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ is_favourite: favourite }) });
}

export async function getSyncState(): Promise<SyncState | null> {
  const rows: SyncState[] = await (await db("assessor_sync_state", "?id=eq.1&select=*&limit=1")).json();
  return rows[0] ?? null;
}

export async function claimAssessorSync(): Promise<{ claim: SyncClaim | null; nextCheckAt: string | null }> {
  await db("assessor_sync_state", "?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ id: 1, newest_id: null, backfill_cursor: null, backfill_done: false, updated_at: "1970-01-01T00:00:00.000Z" }),
  });
  const state = await getSyncState();
  if (!state) throw new Error("Assessor sync state is unavailable");
  const nextCheck = Date.parse(state.updated_at) + SYNC_INTERVAL_MS;
  if (Number.isFinite(nextCheck) && nextCheck > Date.now()) {
    return { claim: null, nextCheckAt: new Date(nextCheck).toISOString() };
  }
  const claimedAt = new Date().toISOString();
  const rows: Pick<SyncState, "id">[] = await (await db("assessor_sync_state",
    `?id=eq.1&updated_at=eq.${encodeURIComponent(state.updated_at)}&select=id`, {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ updated_at: claimedAt }),
    })).json();
  return rows.length
    ? { claim: { claimedAt, previousUpdatedAt: state.updated_at }, nextCheckAt: null }
    : { claim: null, nextCheckAt: null };
}

export async function saveSyncState(state: Pick<SyncState, "newest_id" | "backfill_cursor" | "backfill_done">, claimedAt: string): Promise<void> {
  const rows: Pick<SyncState, "id">[] = await (await db("assessor_sync_state",
    `?id=eq.1&updated_at=eq.${encodeURIComponent(claimedAt)}&select=id`, {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...state, updated_at: new Date().toISOString() }),
    })).json();
  if (!rows.length) throw new Error("Assessor sync claim expired");
}

export async function releaseAssessorSync(claim: SyncClaim): Promise<void> {
  await db("assessor_sync_state", `?id=eq.1&updated_at=eq.${encodeURIComponent(claim.claimedAt)}`, {
    method: "PATCH", body: JSON.stringify({ updated_at: claim.previousUpdatedAt }),
  });
}

export async function insertGames(games: ImportedGame[]): Promise<number> {
  if (!games.length) return 0;
  const response = await db("assessor_games", "?on_conflict=id&select=id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(games),
  });
  const inserted: Pick<AssessorGame, "id">[] = await response.json();
  return inserted.length;
}
