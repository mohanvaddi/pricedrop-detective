-- =============================================================================
-- PriceDrop Detective — Scrape Tracking Migration
-- =============================================================================
-- Adds per-product scrape health data to product_metrics and scrape
-- configuration to products. All changes are additive (IF NOT EXISTS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- product_metrics: scrape health columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_metrics
  ADD COLUMN IF NOT EXISTS last_scraped_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_price_change_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_count        INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- products: scrape configuration columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS scrape_interval INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS priority        TEXT    NOT NULL DEFAULT 'tier1';

-- Priority values: tier1 (≤5 min) | tier2 (1-2 h) | tier3 (6-12 h) | tier4 (24 h) | tier5 (48 h)
-- scrape_interval is in seconds; reserved for future scheduler use.
