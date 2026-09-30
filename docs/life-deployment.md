# Life deployment

Implemented: /life dashboard, /life/telegram archive, protected POST /api/life/digests importer.
Not implemented yet: Vercel cron collector, OpenAI generation on the server, Telegram delivery.
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

## Remaining daily workflow

Port the local collector into a server-compatible job, or integrate a separately deployed worker. Persist Telegram authentication as a server secret, selected chat IDs, generation progress and delivery status. Add a single-writer lock, retries, deterministic delivery IDs and message splitting before scheduling. Schedule 00:00 UTC for 08:00 Asia/Makassar. Test against a preview with delivery disabled, then perform an explicitly authorized Saved Messages delivery before enabling production cron. Do not claim scheduling is enabled until deployed and verified.
