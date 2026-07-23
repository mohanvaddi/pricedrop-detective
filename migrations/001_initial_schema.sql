-- =============================================================================
-- PriceDrop Detective — Full Schema
-- =============================================================================
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query).
-- This creates the complete database from scratch.
--
-- IMPORTANT: Use the service role key in your .env (SUPABASE_KEY) so the bot
-- can bypass Row Level Security. Never expose the service role key client-side.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. users
--    Telegram user accounts. Created automatically on /start or /help.
--    id is the Telegram user ID (a large integer, hence BIGINT).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id         BIGINT      PRIMARY KEY,           -- Telegram user ID
  username   TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 2. trackers
--    One row per product being tracked, owned by one user.
--    id is the first 8 hex chars of sha256(JSON{website, url}).
--    Deleting a user cascades to their trackers.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trackers (
  id          TEXT        PRIMARY KEY,           -- 8-char hash
  url         TEXT        NOT NULL,
  website     TEXT        NOT NULL,              -- 'amazon' | 'flipkart'
  title       TEXT,                              -- scraped product title (nullable)
  alert_price INTEGER,                          -- notify only when price ≤ this (nullable)
  "user"      BIGINT      NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trackers_user_idx ON public.trackers ("user");


-- ---------------------------------------------------------------------------
-- 3. prices
--    Append-only price history for each tracker.
--    Deleting a tracker cascades to its price rows.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prices (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  price      INTEGER     NOT NULL,
  tracker    TEXT        NOT NULL REFERENCES public.trackers (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prices_tracker_idx    ON public.prices (tracker);
CREATE INDEX IF NOT EXISTS prices_created_at_idx ON public.prices (tracker, created_at DESC);


-- ---------------------------------------------------------------------------
-- 4. Row Level Security
--    Enabled on all tables. Since the bot uses the service role key it
--    bypasses RLS automatically — no policies needed for the bot itself.
--    If you ever expose Supabase directly to a client, add policies here.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices   ENABLE ROW LEVEL SECURITY;
