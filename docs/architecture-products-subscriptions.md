# Refactor: Products + Subscriptions Architecture

## Problem

The current `trackers` table has a `user` FK directly on it, making it a 1-to-1 relationship
between a product and a user:

- Two users **cannot** track the same product URL — the second user gets `TrackerExists`.
- The cron job scrapes one row per user, so if two users somehow tracked the same product it
  would be scraped twice.
- `alert_price` lives on the tracker row, so it is shared (there is only one user anyway).

## New Schema

```
users
products       ← one row per unique product (url + website → hash PK)
  ├── prices   ← price history  (FK: product_id — was: tracker)
  └── subscriptions ← join table: (user_id FK, product_id FK, alert_price)
```

### Key design decisions

| Decision | Choice |
|----------|--------|
| How to mark a product "active" | A product is scraped iff it has ≥1 subscription row — no extra `is_active` flag |
| `alert_price` ownership | Moves to `subscriptions` so each user keeps their own threshold |
| Product hash | Still `sha256(JSON{website, url}).slice(0, 8)` — existing IDs users have saved are unchanged |
| Data migration | Fresh setup — drop and recreate, no migration needed |

### SQL

```sql
-- 1. users — unchanged

-- 2. products (replaces trackers)
CREATE TABLE IF NOT EXISTS public.products (
  id         TEXT        PRIMARY KEY,           -- 8-char sha256 hash of {website, url}
  url        TEXT        NOT NULL,
  website    TEXT        NOT NULL,              -- 'amazon' | 'flipkart' | 'myntra' ...
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. subscriptions (new join table)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     BIGINT      NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  product_id  TEXT        NOT NULL REFERENCES public.products(id)  ON DELETE CASCADE,
  alert_price INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx    ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_product_idx ON public.subscriptions (product_id);

-- 4. prices — FK column renamed tracker → product_id
CREATE TABLE IF NOT EXISTS public.prices (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  price      INTEGER     NOT NULL,
  product_id TEXT        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prices_product_idx    ON public.prices (product_id);
CREATE INDEX IF NOT EXISTS prices_created_at_idx ON public.prices (product_id, created_at DESC);
```

---

## Implementation Checklist

### 1. `migrations/001_initial_schema.sql`
Rewrite entirely using the SQL above. Drop `trackers`, add `products` + `subscriptions`,
rename `prices.tracker` → `prices.product_id`.

---

### 2. `db/products.ts` (new — replaces `db/trackers.ts`)

```ts
findProduct(hash)                        // → Product | null
findAllActiveProducts()                  // products with ≥1 subscription (for cron)
findProductsForUser(userId)              // products the user is subscribed to (JOIN subscriptions)
insertProduct(hash, url, website, title) // insert product row
updateProductTitle(hash, title)          // backfill title
```

---

### 3. `db/subscriptions.ts` (new)

```ts
findSubscription(userId, productId)         // → Subscription | null
findSubscriptionsByUser(userId)             // → Subscription[]
findSubscribersForProduct(productId)        // → { user_id, alert_price }[]  (used by cron)
insertSubscription(userId, productId, alertPrice?) 
deleteSubscription(userId, productId)
setAlertPrice(userId, productId, alertPrice)
```

---

### 4. `db/prices.ts`
Change all references of the `tracker` column to `product_id`.

```ts
findPricesByProduct(productId)  // was findPricesByTracker
findLatestPrice(productId)      // unchanged signature, column ref updated
insertPrice(productId, price)   // unchanged signature, column ref updated
```

---

### 5. `constants/types.ts`
Replace `Tracker` with:

```ts
interface Product {
  id: string;
  url: string;
  website: string;
  title: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: number;
  product_id: string;
  alert_price: number | null;
  created_at: string;
}

// Price.tracker → Price.product_id
interface Price {
  id: string;
  price: number;
  product_id: string;
  created_at: string;
}
```

---

### 6. `services/tracker.ts` — major rewrite

#### `createTracker(userId, { url, website? })`
```
1. Detect platform (error if unknown)
2. Check user subscription count ≤ MAX_TRACKERS_PER_USER
3. hash = sha256({website, url})
4. product = findProduct(hash)
   a. product exists AND user already subscribed → throw TrackerExists
   b. product exists AND user NOT subscribed    → insertSubscription → return latest price from DB (no scrape)
   c. product does NOT exist                    → scrape → insertProduct → insertPrice → insertSubscription
5. Return { hash, currentPrice }
```

#### `removeTracker(hash, userId)`
```
1. findSubscription(userId, hash) — throw TrackerNotFound if missing
2. deleteSubscription(userId, hash)
   (product row stays; if 0 subscriptions remain it is simply not scraped)
```

#### `checkPriceChange(product)` — called by cron per product
```
1. findLatestPrice(product.id)
2. scrape current price
3. if unchanged → throw PriceNotChanged
4. insertPrice(product.id, currentPrice)
5. return { currentPrice, recentPrice }
   (subscriber list is fetched separately in server.ts for notification fan-out)
```

#### Other helpers
```ts
getAllActiveProducts()          // → Product[]  (replaces getAllTrackers)
getTrackersByUser(userId)       // → { product, subscription }[]
getTracker(hash, userId)        // → { product, subscription }
setTrackerAlert(hash, userId, alertPrice) // → updates subscription row
```

---

### 7. `server.ts` — scrape-once, notify-all loop

```
GET /track:
  1. activeProducts = getAllActiveProducts()  (products with ≥1 sub)
  2. for each product (in parallel):
       a. { currentPrice, recentPrice } = checkPriceChange(product)
          (PriceNotChanged → skip)
       b. subscribers = findSubscribersForProduct(product.id)
       c. for each subscriber:
            if subscriber.alert_price !== null && currentPrice > alert_price → skip
            sendMessage(subscriber.user_id, priceChangeMessage)
```

This means one HTTP/browser request per unique product regardless of how many users track it.

---

### 8. `bot/commands.ts` — minor updates

- `createCommand`: handle the new "product exists, subscribed" path with a distinct reply.
- `deleteCommand`: reply `"Unsubscribed from product."` instead of `"Tracker deleted."`.
- `trackerCommand` / `listCommand`: adapt to `{ product, subscription }` shape (alert_price now from subscription).
- `historyCommand`: call `findPricesByProduct` instead of `findPricesByTracker`.

---

### 9. `scripts/update-titles.ts`
Update to use `findAllActiveProducts()` and `updateProductTitle()` from `db/products.ts`.

---

### 10. `db/database.types.ts`
After applying the new schema to Supabase, run:
```bash
pnpm db:gen-types
```

---

## File Change Summary

| File | Action |
|------|--------|
| `migrations/001_initial_schema.sql` | Rewrite |
| `db/trackers.ts` | **Delete** |
| `db/products.ts` | **New** |
| `db/subscriptions.ts` | **New** |
| `db/prices.ts` | Update `tracker` → `product_id` |
| `db/database.types.ts` | Regenerate (`pnpm db:gen-types`) |
| `constants/types.ts` | Replace `Tracker` with `Product` + `Subscription` |
| `services/tracker.ts` | Major rewrite |
| `server.ts` | Update `startTrackers` loop |
| `bot/commands.ts` | Minor updates |
| `scripts/update-titles.ts` | Minor update |
