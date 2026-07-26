-- =============================================================================
-- PriceDrop Detective — UI/UX Overhaul Migration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- products: thumbnail URL + view counter
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS view_count    INTEGER NOT NULL DEFAULT 0;


-- ---------------------------------------------------------------------------
-- web_users: public display name
-- ---------------------------------------------------------------------------
ALTER TABLE public.web_users
  ADD COLUMN IF NOT EXISTS display_name TEXT;


-- ---------------------------------------------------------------------------
-- subscriptions: per-subscription notification preference
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS notify_every_change BOOLEAN NOT NULL DEFAULT TRUE;
