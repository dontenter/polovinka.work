import { createHash } from "node:crypto";
import { isAssessorGameId } from "@/lib/assessor-id";

export const ASSESSOR_TELEGRAM_CHAT_ID = "5303410048";
export const ASSESSOR_TELEGRAM_CHAT_TITLE = "PG Sandbox Assessment";
export type AssessorNotification = { game_id: string; title: string; reason: string | null };

export function assessorNotificationText(job: AssessorNotification): string {
  if (!isAssessorGameId(job.game_id)) throw new Error("Invalid notification game ID");
  const title = job.title.replace(/[\r\n]+/g, " ").trim().slice(0, 250);
  const reason = job.reason?.trim().slice(0, 2000);
  return `🚩 Prohibited content\n\n${title}\nhttps://playgama.ai/play/${job.game_id}` +
    (reason ? `\n\nNote: ${reason}` : "") + `\n\n#assessor_${job.game_id}`;
}

export function assessorNotificationRandomId(id: string): string {
  if (!isAssessorGameId(id)) throw new Error("Invalid notification game ID");
  return createHash("sha256").update(`assessor-prohibited:${ASSESSOR_TELEGRAM_CHAT_ID}:${id}`).digest().readBigInt64BE().toString();
}
