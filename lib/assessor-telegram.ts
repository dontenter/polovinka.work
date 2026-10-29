import "server-only";
import { randomUUID } from "node:crypto";
import bigInt from "big-integer";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { Logger, LogLevel } from "telegram/extensions/Logger";
import { ASSESSOR_TELEGRAM_CHAT_ID, ASSESSOR_TELEGRAM_CHAT_TITLE, assessorNotificationRandomId, assessorNotificationText, type AssessorNotification } from "@/lib/assessor-telegram-core";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

async function rpc<T>(name: string, body: unknown): Promise<T> {
  const key = process.env.SUPABASE_SECRET_KEY ?? required("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${required("SUPABASE_URL")}/rest/v1/rpc/${name}`, {
    method: "POST", headers: {
      apikey: key, "Content-Type": "application/json",
      ...(!key.startsWith("sb_secret_") ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.json();
}

export async function deliverAssessorNotifications(): Promise<{ status: string; sent?: number; failed?: number }> {
  if (process.env.VERCEL_ENV !== "production" || process.env.ASSESSOR_TELEGRAM_ENABLED !== "true") return { status: "disabled" };
  const owner = randomUUID();
  const jobs = await rpc<AssessorNotification[]>("assessor_telegram_claim", { p_owner: owner });
  if (!jobs.length) return { status: "idle", sent: 0 };
  let client: TelegramClient | undefined;
  let sent = 0;
  const remaining = new Set(jobs.map(job => job.game_id));
  const deadline = Date.now() + 130000;
  const checkpoint = async (id: string, messageId: number | null, error: string | null) => {
    const saved = await rpc<boolean>("assessor_telegram_checkpoint", {
      p_game_id: id, p_owner: owner, p_message_id: messageId, p_error: error,
    });
    if (!saved) throw new Error("Notification lease lost");
  };
  try {
    client = new TelegramClient(new StringSession(required("LIFE_TELEGRAM_SESSION")),
      Number(required("LIFE_TELEGRAM_API_ID")), required("LIFE_TELEGRAM_API_HASH"), {
        connectionRetries: 1, requestRetries: 1, autoReconnect: false,
        floodSleepThreshold: 0, timeout: 10, baseLogger: new Logger(LogLevel.NONE),
      });
    await client.connect();
    if (!(await client.isUserAuthorized())) throw new Error("Telegram session expired");
    const peer = new Api.InputPeerChat({ chatId: bigInt(ASSESSOR_TELEGRAM_CHAT_ID) });
    const entity = await client.getEntity(peer);
    if (!(entity instanceof Api.Chat) || entity.id.toString() !== ASSESSOR_TELEGRAM_CHAT_ID ||
        entity.title !== ASSESSOR_TELEGRAM_CHAT_TITLE || entity.deactivated || entity.migratedTo) {
      throw new Error("Telegram destination changed");
    }
    let recent = await client.getMessages(peer, { limit: 50 });
    for (const job of jobs) {
      if (Date.now() > deadline) throw new Error("Notification time budget exceeded");
      const body = assessorNotificationText(job);
      // Search by a per-game marker too: retries must survive new messages burying
      // an earlier delivery and the database acknowledgement failing afterwards.
      const marker = `#assessor_${job.game_id}`;
      const matches = recent.some(message => message.out && message.message === body)
        ? recent : await client.getMessages(peer, { search: marker, limit: 10 });
      let delivered = matches.find(message => message.out && message.message === body);
      if (!delivered) {
        await client.invoke(new Api.messages.SendMessage({
          peer, message: body, randomId: bigInt(assessorNotificationRandomId(job.game_id)), noWebpage: true,
        }));
        recent = await client.getMessages(peer, { limit: 20 });
        delivered = recent.find(message => message.out && message.message === body);
      }
      if (!delivered) throw new Error("Telegram delivery uncertain");
      await checkpoint(job.game_id, delivered.id, null);
      remaining.delete(job.game_id);
      sent++;
    }
    return { status: "sent", sent };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safe = /^(Missing [A-Z_]+|Supabase \d+|Notification lease lost|Notification time budget exceeded|Telegram session expired|Telegram destination changed|Telegram delivery uncertain|Invalid notification game ID)$/.test(message)
      ? message : "Telegram or network error";
    for (const id of remaining) await checkpoint(id, null, safe).catch(() => undefined);
    console.error("Assessor Telegram notification failed:", safe);
    return { status: "failed", sent, failed: remaining.size };
  } finally {
    await client?.disconnect();
  }
}
