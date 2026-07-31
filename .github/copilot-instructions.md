# Copilot Instructions

## Commit Policy

**Never commit code unless the user explicitly says to commit.** Complete all
implementation and verification first, then wait for the user to say "commit" or
"go ahead and commit" before running any `git commit`.

## Documentation Freshness (required)

`docs/` is the source of truth for how the system works.

**On every turn, before you finish: if you changed code or documented
behaviour, update the matching doc (and this file, if a convention changed) in
the same change.** Don't defer it to a follow-up. Skip only for changes that
don't alter documented behaviour — pure bug fixes, refactors, formatting, or
non-code prompts — in which case no doc edit is needed.

Mapping:

| Change | Update |
|--------|--------|
| `shared/src/db/schema.ts` | `docs/db-structure.md` — regenerate the Mermaid ER diagram + migration list; run `pnpm db:generate` |
| `scrapers/src/scraper/**`, `detect.ts`, `selectors.json` | `docs/scrapers.md` (+ `scraper-generator` skill) |
| `scrapers/src/scraper/{browser,session-manager}.ts` | `docs/session-scraper.md` |
| `scrapers/src/categorizer.ts`, `scheduler.ts` | `docs/categorizer.md` |
| `scrapers/src/{worker,price-recorder}.ts`, `server/src/api/routes/**`, `notifier.ts` | `docs/workflow-architecture.md` |
| package layout, commands, boundaries | `docs/code-architecture.md` |
| features, stores, limits | `docs/product-overview.md` |

A **Copilot CLI hook** (`.github/hooks/docs-freshness.json` → `scripts/docs-hook.js`,
a non-blocking `postToolUse` hook on `edit`/`create`) reminds the agent to update
the matching doc whenever it edits functional source. Run `pnpm docs:check` for a
manual, staged-changes audit. On-demand skills: `doc-updater`, `skill-updater`,
`code-reviewer` (→ `docs/review/`), `review-fixer`.

## Architecture (pnpm-workspace monorepo)

Four packages, one Docker image run as different services. Full detail in
[`docs/code-architecture.md`](../docs/code-architecture.md).

- **`shared` (`@pricedrop/shared`)** — Drizzle schema + Postgres client + domain
  helpers (hash, format, limits, `CustomError`, enums). Imported by both services.
- **`server` (:4000)** — Express REST API (`/api/*`), Telegram (grammy) + Reddit
  bots, and the notification-queue poller. Serves built `web/dist` in prod.
  **Never scrapes directly** — calls the scrapers service via `SCRAPER_URL`.
- **`scrapers` (:5001)** — `POST /scrape` + an in-process `node-cron` worker
  (`runBatch()` every minute) that scrapes due products, categorizes, records
  prices, and reschedules.
- **`web`** — React + Vite SPA against the server API.

Integration seams (keep it to these two): **Postgres** (shared truth) and one
**`server → scrapers` HTTP** call on add. Scheduled results reach users via
`notification_queue` → server notifier → Telegram/Reddit.

### Key runtime flows (see `docs/workflow-architecture.md`)

- **Add:** `POST /api/subscriptions` → server `POST /scrape` → hash product
  (`sha256({website, canonicalId})`, 8 chars) → upsert product + first price +
  subscription.
- **Scrape loop:** cron → `findDueProducts` → scrape → `PriceRecorder.record`
  (store if first / price changed / availability flipped / ≥24h stale) →
  `ScrapeScheduler.apply` (category base interval × price-volatility multiplier).
- **Notify:** worker enqueues `notification_queue`; server poller (30s) delivers
  and marks `sent`.

## Scraping

Four fetch strategies, cheapest first (`scrapers/src/scraper/base.ts`):
`fetchPageWithAxios` → `fetchPageWithMobileAxios` → `fetchPageWithBrowser`
(**Camoufox** stealth Firefox) → `fetchPageWithSession` (Camoufox render +
reused Akamai cookies, e.g. **AJIO**). See `docs/scrapers.md` and
`docs/session-scraper.md`. Adding a store is a multi-file task — use the
`scraper-generator` skill.

## Dev Commands

```bash
pnpm dev            # server, hot reload (tsx watch)
pnpm dev:scrapers   # scrapers service, hot reload
pnpm scrape:worker  # one scrape batch, then exit
pnpm recategorize   # re-run categorizer over uncategorized products
pnpm typecheck      # tsc --noEmit (whole workspace)
pnpm test           # jest (live scraper integration tests)
pnpm docs:check     # manual docs-freshness audit of staged changes
docker compose up --build   # postgres + migrate + server + scrapers
```

## DB change flow

```bash
$EDITOR shared/src/db/schema.ts
pnpm db:generate            # writes shared/drizzle/NNNN_*.sql + meta snapshot
# review the SQL
pnpm db:migrate             # or `docker compose up --build` (migrate service applies it)
# update docs/db-structure.md (ER diagram + migration list)
```

## Conventions

- **TypeScript** strict + `noUncheckedIndexedAccess` — indexed/regex-group access
  is `T | undefined`; guard then `!`-assert. Runner is **`tsx`** (no build step
  for Node services).
- **`CustomError`** (`shared/src/error.ts`) for all handled errors; branch on its
  `name` (e.g. `PriceNotFound`, `SessionExpired`, `PlatformNotSupported`).
- **Prices** are positive **integers** (₹, no decimals). **`prices`** is
  append-only; read latest from `product_metrics` rollup.
- **Camoufox** owns the browser fingerprint — don't override `userAgent`/`locale`
  in `newContext`; avoid `block_images`; never `waitUntil:'networkidle'` on AJIO.
- **Prettier:** single quotes, ES5 trailing commas, 150-char width.
- **Limits** (`shared/src/limits.ts`): 20 trackers/user, 3 lists/user.
- Native builds (`bcrypt`, `better-sqlite3`, `@swc/core`, `esbuild`,
  `unrs-resolver`, `supabase`) are allowlisted in `pnpm-workspace.yaml`
  (`allowBuilds`); `.npmrc` sets `verify-deps-before-run=false`.

## Env (see `.env.example`)

`DATABASE_URL`, `SCRAPER_URL` (server→scrapers), `SCRAPER_PORT`, `SCRAPE_CRON`,
`TELEGRAM_BOT_TOKEN`, `REDDIT_*` (optional), `CAMOUFOX_HEADLESS`,
`CAMOUFOX_INSTALL_DIR`, JWT secret.
