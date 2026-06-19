# AGENTS.md — polovinka.work

> This file is written for AI coding agents. It describes the project as it actually is, based on the source files. When you edit code, keep this guide in mind.

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
- Testing results: `{prod|dev}/game-testing-results/{id}.json`
- `NODE_ENV === "production"` uses the `prod` prefix; otherwise `dev`.
- Listing fetches all blobs and filters/sorts in memory; pagination is applied after the full fetch.

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

---

## 10. Security considerations

- **Do not commit secrets.** `.env*.local` and `.vercel` are gitignored.
- **Lab auth is disabled if env vars are missing.** Always set `LAB_PASSWORD_HASH`, `LAB_PASSWORD_SALT`, and `LAB_SECRET` in production.
- **Uploaded/scraped images are validated** for protocol, content-type, and size before processing or storage.
- **API keys are server-side only.** OpenAI/Nano Banana/R2 keys are never sent to the browser.
- **Vercel Blob result files are stored as `access: "public"`.** Anyone with the blob URL can read them. This is intentional for the current internal-tool use case, but do not store sensitive data in results.
- **History deletion is guarded by a hardcoded password** (`DELETE_PASSWORD = "delete"` in `app/lab/game-seo/history/page.tsx` and `app/lab/game-testing/history/page.tsx`). This is a simple guard, not a security boundary.
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
- The Game SEO `buildContext` function is duplicated/shared between the editor and the detail view. Keep the serialization format stable because the prompt depends on exact English labels and `Q:`/`A:` markers.
- Game SEO results are versioned: every save creates a new immutable version snapshot and updates a manifest. The detail page shows a timeline of versions and a human-readable diff. Editing an existing result loads it into `/lab/game-seo?id={id}` and appends a new version on save.
- Game SEO results have a `qcChecked` flag stored in the manifest. It can be toggled from the history list and is persisted without creating a new version.
- `app/api/fetch-icon` and `app/api/upload-image` require Node.js; they will not work in Edge runtime.

---

## 13. Troubleshooting

- **Lab routes redirect to login unexpectedly:** check `LAB_SECRET` and the `lab_session` cookie.
- **SEO/testing history empty locally:** ensure `BLOB_READ_WRITE_TOKEN` is set; otherwise blob storage fails.
- **Cover generation fails:** check `NANOBANANA_API_KEY` and the browser console for `[Image Generator]` debug logs.
- **Image upload fails:** verify R2 credentials and bucket permissions.
