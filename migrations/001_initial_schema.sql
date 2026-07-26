-- =============================================================================
-- PriceDrop Detective — Full Schema
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Abstract identity — one row per unique person across all platforms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 2. Telegram provider
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telegram_users (
  user_id     UUID   NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL UNIQUE,
  username    TEXT   NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS telegram_users_telegram_id_idx ON public.telegram_users (telegram_id);


-- ---------------------------------------------------------------------------
-- 3. Web provider — email + password auth for the WebUI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.web_users (
  user_id       UUID        NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 4. Reddit provider
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reddit_users (
  user_id         UUID NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  reddit_username TEXT NOT NULL UNIQUE
);


-- ---------------------------------------------------------------------------
-- 5. products — one row per unique product URL, shared across subscribers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id         TEXT        PRIMARY KEY,   -- 8-char sha256 hash of {website, canonicalId}
  url        TEXT        NOT NULL,
  website    TEXT        NOT NULL,      -- 'amazon' | 'flipkart' | 'myntra' ...
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 6. subscriptions — join table: user ↔ product
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  product_id  TEXT        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_price INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx    ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_product_idx ON public.subscriptions (product_id);


-- ---------------------------------------------------------------------------
-- 7. prices — append-only price history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prices (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  price      INTEGER     NOT NULL,
  product_id TEXT        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prices_product_idx    ON public.prices (product_id);
CREATE INDEX IF NOT EXISTS prices_created_at_idx ON public.prices (product_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reddit_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices         ENABLE ROW LEVEL SECURITY;
