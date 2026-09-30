import "server-only";
export type LifeDigest = {
  id: string;
  from: string;
  to: string;
  model: string;
  messageCount: number;
  markdown: string;
};
const baseUrl = () => process.env.SUPABASE_URL;
const apiKey = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
export const lifeStorageConfigured = () => Boolean(baseUrl() && apiKey());
async function database(query: string, init: RequestInit = {}): Promise<Response> {
  const url = baseUrl();
  const key = apiKey();
  if (!url || !key) throw new Error("Supabase is not configured");
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  // New secret keys go in apikey only. Legacy JWT service_role keys also use Authorization.
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/life_digests${query}`, {
    ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return response;
}
export function parseDigest(value: unknown): LifeDigest {
  if (!value || typeof value !== "object") throw new Error("Invalid digest");
  const d = value as Record<string, unknown>;
  if (typeof d.id !== "string" || !/^\d{8}T\d{6}Z$/.test(d.id) ||
      typeof d.from !== "string" || !Number.isFinite(Date.parse(d.from)) ||
      typeof d.to !== "string" || !Number.isFinite(Date.parse(d.to)) || Date.parse(d.to) <= Date.parse(d.from) ||
      typeof d.model !== "string" || d.model.length > 80 ||
      typeof d.messageCount !== "number" || !Number.isSafeInteger(d.messageCount) || d.messageCount < 0 ||
      typeof d.markdown !== "string" || !d.markdown.trim() || d.markdown.length > 100000) {
    throw new Error("Invalid digest");
  }
  return { id: d.id, from: d.from, to: d.to, model: d.model, messageCount: d.messageCount, markdown: d.markdown };
}
type DigestRow = { id: string; period_from: string; period_to: string; model: string; message_count: number; markdown: string };
function decode(row: DigestRow): LifeDigest {
  return parseDigest({ id: row.id, from: row.period_from, to: row.period_to,
    model: row.model, messageCount: row.message_count, markdown: row.markdown });
}
export async function storeDigest(digest: LifeDigest): Promise<void> {
  const d = parseDigest(digest);
  await database("", { method: "POST", body: JSON.stringify({ id: d.id,
    period_from: d.from, period_to: d.to, model: d.model, message_count: d.messageCount, markdown: d.markdown }) });
}
export async function readDigest(id: string): Promise<LifeDigest | null> {
  if (!/^\d{8}T\d{6}Z$/.test(id)) return null;
  const rows: DigestRow[] = await (await database(`?id=eq.${id}&select=*&limit=1`)).json();
  return rows.length ? decode(rows[0]) : null;
}
export async function listDigests(cursor?: string) {
  if (cursor && !/^\d{8}T\d{6}Z$/.test(cursor)) throw new Error("Invalid archive cursor");
  const rows: { id: string }[] = await (await database(`?select=id&order=id.desc&limit=31${cursor ? `&id=lt.${cursor}` : ""}`)).json();
  const items = rows.slice(0, 30).map(row => row.id);
  return { items, cursor: rows.length > 30 ? items[items.length - 1] : undefined };
}
