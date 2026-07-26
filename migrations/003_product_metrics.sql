-- =============================================================================
-- PriceDrop Detective — Product Metrics Table
-- =============================================================================
-- Stores pre-computed price metrics per product, updated atomically on every
-- price insert. Avoids expensive correlated subqueries in the tracker list.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.product_metrics (
  product_id    TEXT        NOT NULL PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  initial_price INTEGER,                                -- price at first tracking
  current_price INTEGER,                                -- most recently recorded price
  all_time_low  INTEGER,                                -- minimum price ever recorded
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_metrics_product_idx ON public.product_metrics (product_id);

-- ---------------------------------------------------------------------------
-- Backfill: populate metrics from existing prices rows
-- Safe to run on fresh DBs (no rows in prices → no-op)
-- ---------------------------------------------------------------------------
INSERT INTO public.product_metrics (product_id, initial_price, current_price, all_time_low, updated_at)
SELECT
  p.product_id,
  first_price.price  AS initial_price,
  last_price.price   AS current_price,
  p.min_price        AS all_time_low,
  now()              AS updated_at
FROM (
  SELECT product_id, MIN(price) AS min_price
  FROM public.prices
  GROUP BY product_id
) p
JOIN LATERAL (
  SELECT price FROM public.prices
  WHERE product_id = p.product_id
  ORDER BY created_at ASC LIMIT 1
) first_price ON true
JOIN LATERAL (
  SELECT price FROM public.prices
  WHERE product_id = p.product_id
  ORDER BY created_at DESC LIMIT 1
) last_price ON true
ON CONFLICT (product_id) DO NOTHING;
