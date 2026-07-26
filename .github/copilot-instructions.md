# Copilot Instructions

## Commit Policy

**Never commit code unless the user explicitly says to commit.** Complete all implementation and verification first, then wait for the user to say "commit" or "go ahead and commit" before running any `git commit` command.

## Dev Commands

```bash
pnpm dev                    # Start server with hot reload (ts-node-dev)
pnpm db:gen-types           # Regenerate Supabase TypeScript types into types/database.types.ts
```

Run a one-off script directly with ts-node:
```bash
npx ts-node scripts/test-selectors.ts   # Test price/title scraping for a URL
npx ts-node scripts/update-titles.ts    # Backfill titles for all existing trackers
```

No test or lint scripts exist. TypeScript strictness acts as the primary type-safety gate.

## Architecture

This is a **Telegram bot** that tracks product prices on Amazon and Flipkart. It has two runtime paths that share the same process:

1. **Bot (grammy)** — `bot.ts` handles Telegram commands (`/create`, `/delete`, `/list`, `/tracker`, `/history`). Commands use `TrackerUtils` and `SupabaseUtils` to persist and query data.

2. **HTTP server (Express)** — `server.ts` exposes `GET /track`, which fetches all trackers from Supabase, scrapes current prices for each, and sends Telegram messages via `bot.api.sendMessage` if prices changed. This endpoint is triggered by an **external cron job / scheduler** — there is no built-in scheduling.

**Data flow for price tracking:**
```
GET /track → SupabaseUtils.fetchTrackers()
           → TrackerUtils.track() per tracker
           → extractor.utils.ts (axios + cheerio scraping)
           → SupabaseUtils.insertPrice()
           → bot.api.sendMessage() (Telegram notification)
```

**Data flow for creating a tracker:**
```
/create <url> <website> → zod validation (NewTrackerDTO)
                        → sha256(url+website) → hash
                        → extractData() (scrape title + price)
                        → SupabaseUtils.insertTracker() + insertPrice()
```

## Supabase Schema

Three tables (types auto-generated into `types/database.types.ts`):

| Table | Key columns | Notes |
|-------|-------------|-------|
| `users` | `id` (Telegram user ID, number), `username` | Created on first `/start` or `/help` |
| `trackers` | `id` (sha256 hash), `user` (FK → users), `url`, `website`, `title` | `title` is nullable; populated at creation |
| `prices` | `id` (uuid), `tracker` (FK → trackers), `price` (number), `created_at` | Append-only; all historical entries kept |

Prices are fetched ordered by `created_at` ascending — the last element is always the most recent price.

After changing the Supabase project schema, regenerate types with `pnpm db:gen-types`.

## Scripts

- **`scripts/test-selectors.ts`** — Calls `TrackerUtils.createTracker()` with a hardcoded URL to verify price/title scraping works. Edit the `url` and `website` fields directly in the file before running. Uses a hardcoded `userId` — it will attempt to insert into the database, so use a test/dev Supabase project.

- **`scripts/update-titles.ts`** — Backfills `title` on all existing tracker rows. Useful after fixing `extractTitle` selectors. Calls `supabase.client.from('trackers').update()` directly.

## Deployment

The bot and HTTP server run in the same Node process started by `pnpm dev` (or `ts-node server.ts`). Required env vars (see `.env.example`):

```
TELEGRAM_BOT_TOKEN=   # From @BotFather
SUPABASE_URL=         # Project URL from Supabase dashboard
SUPABASE_KEY=         # anon/service key from Supabase dashboard
```

`TELEGRAM_CHANNEL` is defined in `config.ts` but not currently used anywhere in the codebase.

The `GET /track` endpoint must be called externally on a schedule (e.g., via cron-job.org, GitHub Actions, or a cloud scheduler) to trigger price checks.

## Key Conventions

- **`CustomError`** is used for all expected/handled errors. It has a `name` field (e.g., `'PriceNotChanged'`, `'TrackerNotFound'`) used for control flow. In bot command handlers, `instanceof CustomError` is always caught and replied to the user; other errors are only logged. `PriceNotChanged` is a normal no-op — `server.ts` silently ignores it.

- **Price/title selectors** in `extractor.utils.ts` are brittle CSS path selectors for Amazon and Flipkart DOM. When scraping breaks, update `priceSelectors` and `titleSelector` maps. Each site has an array of selectors tried in order — the first non-null result wins.

- **`Website` type** is derived from the zod schema: `typeof NewTrackerDTO._type.website`. Adding a new supported site requires: (1) add to `SUPPORTED_SITES` enum in `types/enums.ts`, (2) add entries to both `priceSelectors` and `titleSelector` maps in `extractor.utils.ts`.

- **`SupabaseUtils` filename** is intentionally misspelled as `supabse.utils.ts` — match this when importing.

- **Schema validation middleware** (`middlewares/schema.middleware.ts`) is a generic Express middleware factory: `schemaMiddleware('body' | 'params' | 'query', zodSchema)`. Validated data is stored in `res.locals`. Currently defined but not wired into any routes.

- **Prettier config:** single quotes, trailing commas (ES5 style), 150 char print width.

- **TypeScript:** strict mode with `noUncheckedIndexedAccess` — array index access returns `T | undefined`. Always handle the undefined case (e.g., `prices[prices.length - 1]!` pattern used in the codebase, or null-check first).
