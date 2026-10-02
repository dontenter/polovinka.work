# Life deployment

Implemented: /life dashboard, /life/telegram archive, protected POST /api/life/digests importer.
Implemented: Vercel cron collector, OpenAI server generation, and delivery to Telegram Saved Messages.
The local Python project remains the source of trial digests. Do not upload its .private directory or sessions into this repository.

## Supabase and Life configuration

1. In the new Supabase project's SQL Editor, run `supabase/migrations/202609300001_life_digests.sql` once. This creates only the Life archive table, with RLS and no browser access.
2. Find Project URL in Connect / API settings and a secret key under Settings → API Keys (sb_secret_...). Never send the key in chat or commit it.
3. Open `configure-life.command` from Finder. Enter the URL, secret key and a new Life password. The script saves the connection, scrypt password hash and independent session/import secrets in gitignored `.env.local` with mode 0600. It preserves Lab settings.
4. Copy the following settings to the existing Vercel project's Production environment: SUPABASE_URL, SUPABASE_SECRET_KEY, LIFE_PASSWORD_HASH, LIFE_PASSWORD_SALT, LIFE_SECRET, LIFE_INGEST_SECRET. No NEXT_PUBLIC_ prefix. Do not change Lab variables or BLOB_READ_WRITE_TOKEN.
5. Deploy reviewed changes via the connected GitHub repository. The website is not deployed by the setup script.
6. Verify /life redirects to /life/login when signed out. The Lab password/session must not grant Life access. Check archive access and import after the SQL migration.

Use separate database and secrets for previews. Existing Lab Blob storage is unrelated; no Life Blob store is needed.

## Digest import contract

POST /api/life/digests, Content-Type: application/json, Authorization: Bearer <LIFE_INGEST_SECRET>.
Body (synthetic example):

```json
{
  "id": "20260930T000000Z",
  "from": "2026-09-29T08:00:00+08:00",
  "to": "2026-09-30T08:00:00+08:00",
  "model": "gpt-5-mini",
  "messageCount": 225,
  "markdown": "Example digest"
}
```

A repeated ID is not overwritten. The importer only saves to Supabase; it never sends Telegram messages. Read access is server-side and authenticated. Summaries are rendered as escaped text, with Telegram source links.

## Daily automation

1. Apply `supabase/migrations/202610020001_life_automation.sql` in SQL Editor.
2. Run `scripts/prepare_daily_secrets.py` using the Telegram Summary virtualenv Python. It exports the existing authorized session offline into ignored `.env.local`; never commit or print it.
3. Add LIFE_TELEGRAM_API_ID, LIFE_TELEGRAM_API_HASH, LIFE_TELEGRAM_SESSION, LIFE_TELEGRAM_CHATS, LIFE_OPENAI_API_KEY and CRON_SECRET as Production-only Vercel secrets. Set LIFE_AUTOMATION_ENABLED=true and deploy. Existing Lab OPENAI_API_KEY is independent.
4. Call the production `/api/cron/telegram` with Bearer CRON_SECRET once to verify delivery; repeating it after success must skip work.

Schedule: 00:00 UTC (08:00 Bali), then every 20 minutes through 02:40 UTC for recovery. Generation takes time; delivery follows completion. Each digest covers the preceding 08:00–08:00 Bali interval. gpt-5-mini processes texts and captions with reply context, separated by chat. Voice and attachments are excluded.

Supabase leases serialize jobs for 10 minutes, longer than the 300-second function limit. Each day gets at most five attempts; saved generation and delivery parts are reused on retry. Telegram stable random IDs plus searchable part markers reduce duplicate delivery after interrupted requests. The private archive shows the latest run status. Inspect life_digest_runs or Vercel logs for sanitized errors. Full scheduler outages do not automatically backfill missing dates. Oversized input (>2000 messages per chat or 300k characters) fails visibly and needs chunking.

Disable delivery by setting LIFE_AUTOMATION_ENABLED=false and redeploying. Do not run the local collector concurrently with the exported session. Previews never execute delivery.
