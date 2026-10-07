# AGENTS.md — polovinka.work

> This file is written for AI coding agents. It describes the project as it actually is, based on the source files. When you edit code, keep this guide in mind.

### Agent startup workflow

- Treat this file as the default project map; do not re-audit the whole repository before every task.
- For a new change, use the fast file lookup in section 12, inspect the named primary file and its listed contracts, then implement.
- Expand the investigation only when the requested behavior crosses a documented boundary, the relevant code contradicts this file, or verification exposes an unexpected dependency.
- Before editing, check `git status --short` and preserve unrelated user changes. Do not rewrite monolithic pages merely to make a focused change.
- After changing behavior, update this file only when architecture, storage shapes, routes, scoring rules, environment requirements, or known invariants have materially changed.

---

## 1. Project overview

`polovinka.work` is a personal website + internal tooling lab for Pavel Polovinka. The public part is a single-page landing page. The private `/lab` area hosts several browser tools used for game-publishing operations:

- **Game SEO Text** (`/lab/game-seo`) — editor for structured game descriptions. Editors fill deep-content blocks and a FAQ in Russian, then the app translates the context into English store-page copy via OpenAI.
- **Game Testing** (`/lab/game-testing`) — QA checklist/rating form that produces developer feedback from a requirement database. Supports English/Russian feedback, AI-enhanced notes, and screenshot upload.
- **Image Generator** (`/lab/image-generator`) — generates platform-specific game cover images from a source cover/icon using the Nano Banana API, plus client-side cropping/resizing/compression.

The project is a Next.js App Router application with no database. Persistent data is stored in **Vercel Blob** (JSON result files) and **Cloudflare R2** (screenshots/covers).

---

## 2. Technology stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI runtime | React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 3.4 + PostCSS + autoprefixer |
| UI primitives | Hand-written components in `components/ui/*` styled like shadcn/ui (uses `class-variance-authority`, Radix `Slot`, `lucide-react`) |
| Fonts | Google Fonts via `next/font/google` — Outfit (`--font-outfit`) and Orbitron (`--font-game`) |
| Icons | `lucide-react` |
| Image processing | `sharp` (server), `react-easy-crop` + HTML canvas (client) |
| Object storage | `@vercel/blob` for JSON results; Cloudflare R2 (`@aws-sdk/client-s3`) for image uploads |
| AI providers | OpenAI (`gpt-3.5-turbo`, `gpt-4o-mini`), Nano Banana (`api.nanobananaapi.ai`) |
| Package manager | npm (lockfile `package-lock.json`) |
| Linting | ESLint 9 + `eslint-config-next` |

### Important runtime notes

- The project uses **Next.js App Router** route handlers (`app/api/**/route.ts`).
- `middleware.ts` runs on the Edge runtime.
- Some API routes rely on Node-only APIs (`sharp`, `Buffer`, AWS SDK) and therefore require a Node.js runtime environment (standard Vercel Node.js functions).
- `next.config.ts` is empty — there is no static export. The app is built as a dynamic Next.js app.

---

## 3. Project structure

```
app/                  # Next.js App Router
  api/                # API route handlers
    auth/lab/         # Lab login/logout
    game-seo/         # CRUD for SEO results stored in Vercel Blob
    game-testing/     # CRUD for testing results stored in Vercel Blob
    generate-cover/   # Nano Banana cover generation + callback + status
    fetch-icon/       # Download external icon, convert to JPEG, upload to Blob
    upload-image/     # Upload image to Cloudflare R2
    proxy-image/      # Simple image proxy with URL validation
    generate-description/      # OpenAI translate/format QA to English (GPT-3.5)
    generate-seo-description/  # OpenAI translate full SEO context (GPT-4o-mini)
    enhance-feedback/          # OpenAI rewrite notes as professional feedback
    translate-feedback/        # OpenAI translate feedback en/ru
  lab/                # Protected lab pages
    page.tsx          # Lab dashboard
    login/page.tsx    # Password login
    game-seo/         # SEO editor + history + detail
    game-testing/     # QA form + history + detail
    image-generator/  # Cover/icon generator
  globals.css         # Tailwind directives + CSS variables (light/dark)
  layout.tsx          # Root layout, fonts, site header
  page.tsx            # Public landing page
components/
  ui/                 # Reusable UI components (Button, Card, Input, etc.)
  site-nav.tsx        # Header navigation
lib/
  auth-lab.ts         # Cookie-based session signing/verification (Web Crypto)
  blob-index.ts       # Lightweight Vercel Blob indexes + 15-second in-memory cache
  game-seo-storage.ts # Client-side helpers for SEO API + types
  game-testing-storage.ts # Client-side helpers for testing API + types
  requirements.ts     # QA requirement logic, maps, feedback generation
  requirements-data.json # Source data for QA checks
  utils.ts            # `cn()` Tailwind class merger
public/               # Static assets (photo.png, playgama-logo.*)
assets/               # Source photo.png (duplicated in public/)
```

### Module conventions

- `app/*` are Server Components by default.
- Interactive lab pages are marked `"use client"` and keep most logic colocated in `page.tsx`.
- Shared client utilities live in `lib/*`.
- Path alias `@/*` maps to the project root (`./*`).

---

## 4. Build and development commands

```bash
# Install dependencies
npm install

# Start local dev server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server (requires build first)
npm run start

# Lint
npm run lint
```

There are no automated tests in the repo. Verify changes by running `npm run build` and manually testing the affected lab tool locally.

---

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in values. Never commit `.env.local` (it is gitignored).

> **Current repository caveat:** `.env.example` is stale and currently documents Gemini/R2 only. The source code is the authority for the complete list below. Update `.env.example` when environment-related code changes.

```bash
# OpenAI (used by generate-description, generate-seo-description, enhance-feedback, translate-feedback)
OPENAI_API_KEY=sk-...

# Nano Banana (used by image-generator cover generation)
NANOBANANA_API_KEY=...

# Vercel Blob (used by game-seo / game-testing result storage and fetch-icon)
BLOB_READ_WRITE_TOKEN=...

# Lab authentication (all three required to enable auth; if any is missing, /lab is publicly accessible)
LAB_PASSWORD_HASH=sha256_hex_of_salt+password
LAB_PASSWORD_SALT=any_salt
LAB_SECRET=random_string_for_hmac

# Cloudflare R2 (used by upload-image for QA screenshots)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://your-domain.com          # optional, falls back to R2 native URL

# Optional public app URL (used by generate-cover callback)
NEXT_PUBLIC_APP_URL=https://polovinka.work
```

### Lab password hashing

The login route hashes `salt + password` with SHA-256 and compares it to `LAB_PASSWORD_HASH`. To generate a hash locally:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_SALT' + 'YOUR_PASSWORD').digest('hex'))"
```

---

## 6. Authentication and authorization

- `/lab` and all subroutes except `/lab/login` are protected by `middleware.ts`.
- The middleware checks the `lab_session` cookie, verifies the HMAC-SHA256 signature with `LAB_SECRET`, and validates the token is ≤ 7 days old.
- If `LAB_SECRET` (or the password hash/salt) is not configured, the middleware allows access — useful for local development but dangerous in production.
- The session cookie is `httpOnly`, `secure` only in production, `sameSite: "lax"`, max-age 7 days.
- `middleware.ts` matches `/lab` only. The handlers under `/api/**` currently do **not** verify the lab session themselves, so protecting the UI does not protect direct API calls.

---

## 7. Code style guidelines

### TypeScript

- Strict mode is enabled (`strict: true` in `tsconfig.json`).
- Use explicit types for exported functions and props.
- Prefer `type` over `interface` for data shapes unless you need declaration merging.

### Tailwind / CSS

- Design tokens are defined as HSL CSS variables in `app/globals.css`.
- Tailwind config extends `colors` using `hsl(var(--name))`.
- Dark mode class is `dark` (`darkMode: ["class"]`).
- Use `cn()` from `lib/utils.ts` to merge conditional classes.
- Custom game-themed utility classes are in `app/globals.css` (`.game-panel`, `.game-screen`, `.shadow-game`, etc.).

### Components

- UI components accept `className`, support `variant`/`size` via `cva`, and expose `asChild` where appropriate (see `components/ui/button.tsx` as the reference pattern).
- Client components start with `"use client";`.
- Icons come from `lucide-react`.

### Language/content conventions

- The editor UI is mostly in **Russian** (requirement labels, FAQ presets, deep-content block labels).
- Serialized/AI-facing labels are in **English** (e.g. `Core Gameplay & Story`, `Key Features`, `Q:` / `A:`).
- Game-specific names (modes, characters, items) should be preserved exactly as they appear in the game UI, usually in Latin script.

---

## 8. Data storage details

### Vercel Blob

- SEO results:
  - Current manifest: `{prod|dev}/game-seo-results/{id}/manifest.json`
  - Version snapshots: `{prod|dev}/game-seo-results/{id}/versions/{versionId}.json`
  - Legacy single-blob results (`{id}.json`) are still readable and are auto-migrated to the manifest format on the first edit.
  - Optional `fullSeoBefore` and `fullSeoAfter` HTML fields are stored in both the manifest and the current version snapshot. They are edited from the detail page (`PATCH /api/game-seo/[id]`) without creating a new version, and existing values are preserved when an older result is re-saved from the editor.
- Testing results: `{prod|dev}/game-testing-results/{id}.json`
- Lightweight list indexes:
  - `{prod|dev}/game-seo-results/index.json`
  - `{prod|dev}/game-testing-results/index.json`
  - `lib/blob-index.ts` caches each index in-process for 15 seconds.
  - If an index is missing or unreadable, it is rebuilt by listing and fetching existing result blobs.
- `NODE_ENV === "production"` uses the `prod` prefix; otherwise `dev`.
- Normal history listing reads the lightweight index, then searches and paginates it in memory. Full blob enumeration happens only while rebuilding a missing index.
- Index updates use read-modify-write without locking. Concurrent saves can theoretically overwrite one another's index changes even though the result blobs themselves are saved.

### Cloudflare R2

- QA screenshots are uploaded to `game-testing/{timestamp}-{random}.{ext}`.
- Images must be ≤ 10 MB and must start with `image/`.

---

## 9. External API behavior

- **OpenAI routes** proxy requests to `https://api.openai.com/v1/chat/completions`. They return 500 if `OPENAI_API_KEY` is missing.
- **Nano Banana cover generation** is asynchronous:
  1. `POST /api/generate-cover` creates a task and returns a `taskId`.
  2. The client polls `GET /api/generate-cover/status?taskId=...` until success/failure.
  3. `POST /api/generate-cover/callback` currently just acknowledges the callback.
- **fetch-icon** downloads an external image, converts AVIF/WebP/SVG to JPEG with `sharp`, validates size/type, and uploads to Vercel Blob.
- **proxy-image** fetches a remote image by URL, validates the protocol is `http:`/`https:`, forwards the response with a 5-minute private cache.

### End-to-end tool flows

#### Game SEO

1. `app/lab/game-seo/page.tsx` collects Russian source facts in deep-content blocks and confirmed FAQ pairs.
2. Its local `buildContext()` filters placeholders and blocks without enough useful content, then serializes stable English labels plus Russian answers.
3. `POST /api/generate-seo-description` sends that context to OpenAI `gpt-4o-mini` for translation/editorial cleanup.
4. Generation automatically saves the result; manual save uses the same endpoint.
5. `POST /api/game-seo` writes an immutable version snapshot, updates the manifest, computes a human-readable change summary, resets `qcChecked` after real content changes, and updates the index.
6. `PATCH /api/game-seo/[id]` changes `qcChecked`, `fullSeoBefore`, or `fullSeoAfter` without creating a new version.

Most deep-content blocks require at least two non-placeholder items. Levels also qualify with both count and structure; Story can qualify with prose in `meta.structure`. FAQ items must be confirmed and have both a question and an answer.

#### Game Testing

1. `app/lab/game-testing/page.tsx` collects basic checks, optional feature checks, weighted rating criteria, notes, and selected requirement issues.
2. `lib/requirements.ts` deterministically produces grouped developer feedback from `lib/requirements-data.json`.
3. `/api/enhance-feedback` professionally rewrites user notes without inventing facts; `/api/translate-feedback` translates the final feedback while protecting technical terms.
4. Screenshots are uploaded through `/api/upload-image` to Cloudflare R2 and their URLs are inserted into the feedback.
5. `POST /api/game-testing` writes one mutable JSON result and updates the testing index. Unlike SEO, QA results are not versioned.

Rating criteria retain stable IDs for saved results: `popularity_5k` now means >1k likes / >50k downloads, and `size_25mb` now means initial build <20 MB. History/detail pages display saved labels, weights, and scores without recalculating older results.

Rating thresholds are based on the weighted raw total: `>27.5 => 5`, `>23 => 4`, `>18 => 3`, `>13 => 2`, otherwise `1`. `no_annoying` and `ai_made` subtract 2 points each; `text_heavy` subtracts 1 point when checked. `smart_ads` is removed from new checklists; historical results retain it, and it remains excluded from scoring.

#### Image Generator

1. The cover mode accepts an image URL and platform selection (Facebook, MSN, Yandex, Game Distribution, Xiaomi, YouTube).
2. `/api/fetch-icon` fetches the remote source, converts AVIF/WebP/SVG to JPEG when necessary, and uploads a public reference image to Vercel Blob.
3. The client deduplicates required outputs by aspect ratio and starts Nano Banana tasks in parallel.
4. `/api/generate-cover/status` is polled every 3 seconds, up to 60 times.
5. Exact-size resize-only outputs and derived crops are produced client-side with canvas; manual crop and size-constrained JPEG export are also client-side.
6. Icon mode does not call Nano Banana: it creates square sizes `1080, 1024, 512, 450, 300, 192, 16` locally. The 300px export targets 50 KB.

---

## 10. Security considerations

- **Do not commit secrets.** `.env*.local` and `.vercel` are gitignored.
- **Lab auth is disabled if env vars are missing.** Always set `LAB_PASSWORD_HASH`, `LAB_PASSWORD_SALT`, and `LAB_SECRET` in production.
- **API routes are not covered by the lab middleware.** Treat this as known security debt when adding any sensitive or expensive endpoint.
- **Uploaded/scraped images are validated** for protocol, content-type, and size before processing or storage.
- **API keys are server-side only.** OpenAI/Nano Banana/R2 keys are never sent to the browser.
- **Vercel Blob result files are stored as `access: "public"`.** Anyone with the blob URL can read them. This is intentional for the current internal-tool use case, but do not store sensitive data in results.
- **History deletion is guarded by a hardcoded password** (`DELETE_PASSWORD = "delete"` in `app/lab/game-seo/history/page.tsx` and `app/lab/game-testing/history/page.tsx`). This is a simple guard, not a security boundary.
- **Remote image endpoints are SSRF-sensitive.** `fetch-icon` and `proxy-image` currently allow any syntactically valid HTTP(S) URL and do not reject loopback, link-local, or private-network destinations.
- **OpenAI prompts include strict instructions** not to invent facts, add examples, or translate protected technical terms. Preserve those constraints when editing prompts.

---

## 11. Deployment

- The implied deployment target is **Vercel** (Vercel Blob, `.vercel` in `.gitignore`, `VERCEL_URL` fallback in code).
- Deploy via `git push` to a Vercel-connected repository or `vercel --prod`.
- Required environment variables must be configured in the Vercel dashboard.
- Build command: `next build`.

---

## 12. Things to know before changing code

- Editing `lib/requirements-data.json` or `lib/requirements.ts` changes the QA feedback text produced for game developers.
- Editing prompts in `app/api/generate-*/route.ts`, `app/api/enhance-feedback/route.ts`, or `app/api/translate-feedback/route.ts` changes the AI output. Keep the existing "do not invent facts" / "preserve labels" / "no markdown" constraints.
- The Game Testing rating score is computed client-side in `app/lab/game-testing/page.tsx` from weighted criteria. If you add/remove criteria, update both the form and the history/detail pages.
- The Game SEO editor and detail page duplicate filtering/formatting helpers. Keep their rules aligned. Keep the serialization format stable because the OpenAI prompt depends on exact English labels and `Q:`/`A:` markers.
- Game SEO results are versioned: every save creates a new immutable version snapshot and updates a manifest. The detail page shows a timeline of versions and a human-readable diff. Editing an existing result loads it into `/lab/game-seo?id={id}` and appends a new version on save.
- Game SEO results have a `qcChecked` flag stored in the manifest. It can be toggled from the history list and is persisted without creating a new version.
- `app/api/fetch-icon` and `app/api/upload-image` require Node.js; they will not work in Edge runtime.
- `app/api/generate-cover/route.ts` has a known callback-base expression bug: when `NEXT_PUBLIC_APP_URL` is set it can still construct the URL from `VERCEL_URL`, including `https://undefined` if `VERCEL_URL` is absent. Fix this before relying on callbacks; polling is the currently meaningful completion path.
- The main client pages are intentionally monolithic (`game-seo`, `game-testing`, `image-generator`). For a small change, edit locally and avoid an unrelated refactor. For a larger feature, extract cohesive helpers/components while preserving serialized data shapes.

### Fast file lookup for future changes

| Change requested | Start here | Also inspect |
|---|---|---|
| SEO editor fields or validation | `app/lab/game-seo/page.tsx` | detail page, `lib/game-seo-storage.ts`, SEO API types/diff logic |
| SEO prompt/output rules | `app/api/generate-seo-description/route.ts` | editor `buildContext()` and detail rendering |
| SEO versioning/history/QC | `app/api/game-seo/route.ts` | `app/api/game-seo/[id]/route.ts`, versions route, history pages, `lib/blob-index.ts` |
| QA checklist or issue wording | `lib/requirements-data.json`, `lib/requirements.ts` | QA editor and detail/history pages |
| QA rating | `RATING_CRITERIA` and `calculateRating` in `app/lab/game-testing/page.tsx` | history/detail rating badges |
| QA AI feedback/translation | `app/api/enhance-feedback/route.ts`, `app/api/translate-feedback/route.ts` | `FeedbackModal` in QA editor |
| QA screenshots | `app/api/upload-image/route.ts` | screenshot UI in QA editor/detail |
| Cover platform formats | `PLATFORMS` and `getOutputSizes()` in `app/lab/image-generator/page.tsx` | Nano Banana accepted ratios and client crop/compression helpers |
| Nano Banana integration | `app/api/generate-cover/route.ts`, status route | image-generator polling/error handling |
| Login/session behavior | `middleware.ts`, `lib/auth-lab.ts`, `app/api/auth/lab/route.ts` | login page and logout route |
| History list performance | `lib/blob-index.ts` | SEO/testing list and mutation routes |

---

## 13. Troubleshooting

- **Lab routes redirect to login unexpectedly:** check `LAB_SECRET` and the `lab_session` cookie.
- **SEO/testing history empty locally:** ensure `BLOB_READ_WRITE_TOKEN` is set; otherwise blob storage fails.
- **Cover generation fails:** check `NANOBANANA_API_KEY` and the browser console for `[Image Generator]` debug logs.
- **Image upload fails:** verify R2 credentials and bucket permissions.

## Life / Telegram Summary

- `/life` is the private personal dashboard; `/life/telegram` is the digest archive. `/life/login` uses separate `LIFE_PASSWORD_HASH` (scrypt, N=16384/r=8/p=1, 64 bytes hex), `LIFE_PASSWORD_SALT`, `LIFE_SECRET`, and `life_session` cookie. Lab credentials and sessions cannot open Life. Logout only clears Life's cookie.
- `lib/auth-life.ts` verifies HMAC-signed tokens with explicit Life scope and a finite timestamp, valid for 7 days. Middleware and protected server pages both check sessions. Missing configuration always denies access.
- `lib/life-storage.ts` is server-only and uses Supabase REST with `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`). Responses are not cached. No Supabase keys are exposed to browsers.
- Apply `supabase/migrations/202609300001_life_digests.sql` once to create `public.life_digests`. RLS is enabled; anon/authenticated roles have no access. The backend service_role can select/insert, with no browser policies. The existing public Blob store remains for Lab only.
- Archive order is descending by ID, 30 results per page with keyset pagination. Fields: id, period_from, period_to, model, message_count, markdown, created_at. Duplicate IDs are rejected, not overwritten.
- `POST /api/life/digests` uses `LIFE_INGEST_SECRET` for import. Reads are via authenticated server pages. Summaries render escaped text and Telegram links; never raw HTML.
- `configure-life.command` configures `.env.local` with hidden key/password input. It preserves Lab settings and stores only a scrypt password hash. It does not configure Vercel or execute SQL.
- Daily automation: `GET /api/cron/telegram` requires CRON_SECRET and production plus LIFE_AUTOMATION_ENABLED=true. `lib/life-automation.ts` collects the three configured chats with GramJS, generates using gpt-5-mini, persists the digest, and sends split messages to Saved Messages. `vercel.json` starts at 00:00 UTC (08:00 Bali), with 20-minute retries through 02:40 UTC. Apply `202610020001_life_automation.sql` for service-only leases/checkpoints, maximum five attempts per day. Credentials use LIFE_TELEGRAM_API_ID/HASH/SESSION/CHATS and LIFE_OPENAI_API_KEY. Never reuse the Lab key implicitly. Daily input caps fail explicitly at 2000 messages/chat or 300k characters; media is excluded. Stable random IDs and saved part markers protect delivery retries.

- The basic sound-presence check (`sound`, requirement 7) is optional: a No answer does not set `hasFailedBasicChecks` or count as a critical failure. Its feedback, with or without a selected issue, goes under Optional. Audio muting during ads/tab hiding remains mandatory. Saved historical flags are not rewritten.

## Assessor cabinet

- `/lab/assessor` is the single-assessor content review queue and archive. Its API lives under `/api/lab/assessor` and checks the Lab session independently of page middleware; production API access fails closed when `LAB_SECRET` is absent.
- `POST /api/lab/assessor/sync` runs when the assessor opens the page, every five minutes while it stays open, or via the manual button. A conditional update of `assessor_sync_state.updated_at` serializes import attempts and limits them to one every five minutes across instances. It scans `https://playgama.ai/play` by its `Load more` cursor, stops at the previously seen newest ID, then continues initial historical backfill from a saved cursor. Older cards omit timestamps; the importer uses the page cursor date as an approximate internal ordering value. `GET /api/lab/assessor/[id]/launch` resolves the bare `data-game-url` on demand, including for games imported before this change. Playgama's `csp=sandbox` parameter restricts iframe ancestors to Playgama domains, so the bare URL is required for embedding at polovinka.work. There is no assessor cron.
- Apply `supabase/migrations/202610070001_assessor_games.sql` once. `assessor_games` stores source links and review decisions; `assessor_sync_state` stores crawl checkpoints. Both tables are service-role-only with RLS enabled. The public Lab Blob index is not used.
- The assessor UI is in English. The review view embeds the current game on the left and asks the content question on the right. It eagerly loads the next game in a second hidden iframe. Answering displays that game immediately while the decision saves; a failed save restores the previous game and note. There is no timer. Reviews use `pending`, `clear`, `flagged`, or `unavailable`; notes are optional. History is a separate view with status filters.
