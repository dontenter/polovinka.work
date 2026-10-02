import { createHash } from "node:crypto";
export function dailyWindow(day: string) {
  const end = new Date(day + "T00:00:00.000Z"); // 08:00 Asia/Makassar
  if (!Number.isFinite(end.getTime())) throw new Error("Invalid run day");
  return { from: new Date(end.getTime() - 86400000).toISOString(), to: end.toISOString(), id: day.replaceAll("-", "") + "T000000Z" };
}
export function deliveryParts(text: string, id: string): string[] {
  const chars = Array.from(text);
  const chunks: string[] = [];
  let chunk = "";
  for (const char of chars) {
    if (chunk.length + char.length > 3300) { chunks.push(chunk); chunk = ""; }
    chunk += char;
  }
  if (chunk) chunks.push(chunk);
  return chunks.map((part, i) => `${part}\n\n#life_${id}_${i + 1}`);
}
export function deliveryId(id: string, index: number): string {
  return createHash("sha256").update(`life:${id}:${index}`).digest().readBigInt64BE(0).toString();
}
