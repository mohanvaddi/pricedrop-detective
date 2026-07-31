---
name: scraper-generator
description: Generate a new price scraper for any e-commerce website. Invoke when asked to add support for a new store/platform to pricedrop-detective.
---

# Scraper Generator Skill

This skill creates a complete scraper for a new e-commerce website in the **pricedrop-detective** project. It handles all backend and frontend changes needed to support the new platform end-to-end.

---

## Overview

The project scrapes prices from Indian e-commerce sites. Each platform has a scraper class that:
1. **Canonicalizes URLs** — extracts a stable product identifier
2. **Fetches the page** — via one of three strategies (axios, browser, session-based)
3. **Extracts price** — as a positive integer (rupees, no decimals)
4. **Extracts title** — product name string

---

## Step-by-Step Process

### 1. Investigate the Target Website

Before writing any code, determine how the site delivers price data:

```bash
# Quick test — does plain axios get us the price?
npx tsx -e "
const axios = require('axios');
const cheerio = require('cheerio');
(async () => {
  const {data} = await axios.get('<PRODUCT_URL>', {
    headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
  });
  const \$ = cheerio.load(data);
  // Check for JSON-LD
  const ld = \$('script[type=\"application/ld+json\"]').text();
  console.log('JSON-LD:', ld.slice(0, 500));
  console.log('Title tag:', \$('title').text());
})();
"
```

**Decision tree:**

| Condition | Strategy | Base helper |
|-----------|----------|-------------|
| Price visible in SSR HTML (JSON-LD, meta tags, inline script) | **axios** | `fetchPageWithAxios()` |
| Site blocks desktop UA but allows mobile UA | **mobile axios** | `fetchPageWithMobileAxios(url, 'android'\|'iphone')` |
| Price only appears after JavaScript execution | **browser (Camoufox)** | `fetchPageWithBrowser(url, waitUntil)` |
| Site uses Akamai Bot Manager (blocks all bare fetches) | **session (Camoufox + cookie reuse)** | `fetchPageWithSession(url, platform)` |

**Priority: Always prefer axios over browser** — it's 10x faster, uses no memory for the browser, and works in CI.

> Paths in this skill are repo-root-relative. The scrapers package lives under
> `scrapers/` — e.g. `scrapers/src/scraper/platforms/{platform}.ts`. See
> `docs/scrapers.md` and `docs/session-scraper.md` for the full picture.

### 2. Determine URL Canonicalization

Find the product ID pattern in URLs:
- Amazon: `/dp/B0XXXXXX` → `amazon:B0XXXXXX`
- Meesho: `/product-name/p/3or0v9` → `meesho:3or0v9`
- Decathlon: `/p/8326403/name` → `decathlon:8326403`

The canonical form is `{platform}:{product_id}`. Used for deduplication.

### 3. Create the Scraper File

Create `scrapers/src/scraper/platforms/{platform}.ts`:

```typescript
import * as cheerio from 'cheerio';
import { BaseScraper } from '../base';
// Import the appropriate fetch helper if overriding fetchPage:
// import { fetchPageWithMobileAxios, fetchPageWithBrowser, fetchPageWithSession } from '../base';

/**
 * {PlatformName} scraper.
 * [Brief description of how price/title are extracted]
 *
 * URL canonical: {pattern} → {platform}:{id}
 */
export class {PlatformName}Scraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    const match = url.match(/{REGEX_FOR_PRODUCT_ID}/);
    if (match) return `{platform}:${match[1]!}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  // Override ONLY if not using default axios:
  // override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  //   return fetchPageWithMobileAxios(url, 'android');
  //   return fetchPageWithBrowser(url, 'domcontentloaded');
  // }

  extractPrice($: cheerio.CheerioAPI): number {
    // Strategy 1: JSON-LD (most reliable)
    const html = $.html();
    for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try {
        const d = JSON.parse(m[1]!.trim());
        const items = Array.isArray(d) ? d : [d];
        for (const item of items) {
          if (item['@type'] === 'Product' && item.offers) {
            const p = parseInt(String(item.offers.price ?? item.offers.lowPrice ?? 0), 10);
            if (p > 0) return p;
          }
        }
      } catch {}
    }
    // Strategy 2: CSS selector / regex fallback
    // ...
    this.throwPriceNotFound();
  }

  extractTitle($: cheerio.CheerioAPI): string | null {
    // JSON-LD name, then <title> tag as fallback
    const html = $.html();
    for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try {
        const d = JSON.parse(m[1]!.trim());
        const items = Array.isArray(d) ? d : [d];
        for (const item of items) {
          if (item['@type'] === 'Product' && item.name) return item.name as string;
        }
      } catch {}
    }
    const title = $('title').text().trim();
    return title.replace(/\s*[-–|]\s*{SiteName}\s*$/i, '').trim() || null;
  }
}
```

### 4. Register the Scraper

**All files that must be updated (in order):**

#### a) `scrapers/src/scraper/selectors.json`

Add entry (alphabetical order):

```json
"{platform}": {
  "fetchMethod": "axios",
  "price": [],
  "title": [],
  "note": "Brief description of extraction strategy"
}
```

Valid `fetchMethod` values: `"axios"`, `"mobile"`, `"browser"`, `"session"`

#### b) `scrapers/src/scraper/index.ts`

Add import and registry entry:

```typescript
import { {PlatformName}Scraper } from './platforms/{platform}';

// In registry object (alphabetical):
{platform}: new {PlatformName}Scraper(),
```

#### c) `scrapers/src/detect.ts`

Add hostname mapping to the `HOSTNAME_MAP` array:

```typescript
['{hostname}.com', '{platform}'],
```

Place more specific hostnames before generic ones (e.g., `nykaafashion.com` before `nykaa.com`).

#### d) `scrapers/src/worker.ts`

Add the platform key to the `platforms` allow-list used by `platformOf()`.

#### e) `server/src/api/routes/platforms.ts`

Add display name to `PLATFORM_NAMES`:

```typescript
{platform}: '{Display Name}',
```

#### f) `web/src/components/StoreBadge.tsx`

Add to `STORE_META`:

```typescript
{platform}: { label: '{Display Name}', color: 'bg-{color}-100 text-{color}-800 border-{color}-200' },
```

#### g) `web/src/components/StoreDrawer.tsx`

Add to `STORE_COLORS`:

```typescript
{platform}: 'bg-{color}-100 text-{color}-800',
```

#### h) `web/src/pages/Home.tsx`

Add to the `PLATFORMS` array:

```typescript
const PLATFORMS = [..., '{Display Name}'];
```

### 5. Add Test URL

Add a product URL to `scrapers/tests.json`:

```json
[
  "...existing urls...",
  "https://www.{site}.com/product-url"
]
```

---

## How to Test

### Quick single-URL test (recommended first step)

```bash
npx tsx -e "
import { scrape } from './scrapers/src/scraper';
import { detectPlatform } from './scrapers/src/detect';

const url = 'YOUR_PRODUCT_URL';
const platform = detectPlatform(url);
console.log('Detected platform:', platform);
if (platform) {
  scrape(platform, url).then(r => console.log(r)).catch(e => console.error(e));
}
"
```

### Run the full test suite

```bash
pnpm test
# or a single suite:
npx jest scrapers/__tests__/scraper.test.ts --testTimeout=120000
# browser/session platforms (Amazon, Blinkit, AJIO) need the Docker runtime:
docker compose exec scrapers npx jest --config jest.config.ts
```

### Debug a specific extraction issue

```bash
npx tsx -e "
import { resolve } from './scrapers/src/scraper';
import { detectPlatform } from './scrapers/src/detect';

const url = 'YOUR_PRODUCT_URL';
const platform = detectPlatform(url)!;
const scraper = resolve(platform);
scraper.fetchPage(url).then(\$ => {
  // Inspect what we got
  const html = \$.html();
  console.log('Page length:', html.length);
  console.log('JSON-LD blocks:', (html.match(/ld\+json/g) || []).length);
  console.log('Title:', \$('title').text());
  // Try extraction
  try { console.log('Price:', scraper.extractPrice(\$)); } catch(e) { console.error('Price failed:', e); }
  try { console.log('Title:', scraper.extractTitle(\$)); } catch(e) { console.error('Title failed:', e); }
});
"
```

---

## Scraping Strategies (Detailed)

### Strategy 1: Plain Axios (preferred)

**When to use:** Site returns price in server-rendered HTML (JSON-LD, meta tags, inline data).

```typescript
// No override needed — BaseScraper.fetchPage() uses fetchPageWithAxios by default
```

**Pros:** Fast (~1-3s), no browser overhead, works in CI, reliable.
**Cons:** Won't work if price is client-rendered or behind bot protection.

### Strategy 2: Mobile User-Agent Axios

**When to use:** Site's WAF (Akamai, Cloudflare) blocks desktop user-agents but allows mobile.

```typescript
override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  return fetchPageWithMobileAxios(url, 'android'); // or 'iphone'
}
```

**Pros:** Same speed as axios, bypasses many WAFs that only check UA.
**Cons:** Mobile HTML may have different selectors. Test both `'android'` and `'iphone'`.
**Used by:** Meesho, Nykaa Fashion, Croma.

### Strategy 3: Browser (Camoufox)

**When to use:** Price is only available after JavaScript execution (SPA, React hydration).

```typescript
override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  return fetchPageWithBrowser(url, 'domcontentloaded');
  // Options: 'domcontentloaded' | 'networkidle' | 'load'
}
```

Rendering uses **Camoufox** (stealth Firefox) under the hood — see
`docs/session-scraper.md`. Camoufox owns the fingerprint, so don't override
`userAgent`/`locale` in a context.

**waitUntil guidance:**
- `'domcontentloaded'` — fastest, use when data is in SSR HTML or early hydration
- `'load'` — waits for images/resources; rarely needed for price extraction
- `'networkidle'` — waits for no network activity; **avoid if site has WebSockets/polling** (e.g., Blinkit — use domcontentloaded instead)

**Pros:** Works for any site, executes JS fully.
**Cons:** Slow (10-45s), requires the Camoufox/Firefox runtime (installed in Docker), heavy on memory. Not ideal for scheduled tracking.
**Used by:** Amazon, Blinkit, JioMart.

### Strategy 4: Session / cookie-based (Camoufox render + cookie reuse)

**When to use:** Site is behind **Akamai Bot Manager**, which rejects *every*
bare fetch — even the browser's own request API. Curl replay of solved cookies
does **not** work; the product URL must be navigated in a real browser.

```typescript
override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  return fetchPageWithSession(url, '{platform}');
}
```

Then register a `CONFIGS['{platform}']` entry in
`scrapers/src/scraper/session-manager.ts` (`seedUrls`, `cookieDomain`, `ttlMs`,
`readyExpression`) and set `"fetchMethod": "session"` in `selectors.json`. The
session manager solves Akamai once via Camoufox, **persists the solved cookies**
to the `scraper_sessions` table, and injects them into future renders to skip
re-solving. Full details in `docs/session-scraper.md`.

**Pros:** Bypasses Akamai; cookie reuse keeps subsequent scrapes fast (~6-7s).
**Cons:** First solve is slow (~30-60s); requires the Camoufox runtime.
**Used by:** AJIO.

---

## Common Pitfalls

### 1. JSON-LD with malformed JSON
Some sites (Croma) have literal newlines `\n` inside JSON strings that break `JSON.parse`. Use regex fallback:
```typescript
const priceMatch = html.match(/"price"\s*:\s*"?([\d.]+)"?/);
```

### 2. TypeScript strict mode
`noUncheckedIndexedAccess` is enabled — array index access returns `T | undefined`. Always use `!` assertion or null-check:
```typescript
const match = url.match(/pattern/);
if (match) return `platform:${match[1]!}`; // Non-null assertion after guard
```

### 3. Price format
Always return an integer (floor). Remove commas, currency symbols, decimals:
```typescript
const p = parseInt(String(rawPrice).replace(/[₹,]/g, ''), 10);
```

### 4. WAF "Access Denied" pages
If you get a 200 response but HTML is just "Access Denied" or a challenge page:
- Try mobile user-agent first
- If that fails, try browser (Camoufox)
- For Akamai-gated sites, use the session strategy (`fetchPageWithSession`)

### 5. Location-gated pricing
Some sites (JioMart) return price=0 without Indian IP. The scraper code is correct but will fail from non-Indian infrastructure. Document this in the `note` field of selectors.json.

### 6. networkidle timeout
If the browser hangs for 45+ seconds, the site likely has persistent connections (WebSockets, event streams). Switch to `'domcontentloaded'`.

### 7. Frontend type imports
Never import from `drizzle-orm` or any backend-only module in code shared with the frontend Vite build.

---

## File Reference

| File | Purpose |
|------|---------|
| `scrapers/src/scraper/base.ts` | BaseScraper class + fetch helpers (axios/mobile/browser/session) |
| `scrapers/src/scraper/browser.ts` | Camoufox launcher + session render engine |
| `scrapers/src/scraper/session-manager.ts` | Per-platform session reuse/refresh (Akamai) |
| `scrapers/src/scraper/platforms/{platform}.ts` | Each platform's scraper implementation |
| `scrapers/src/scraper/index.ts` | Scraper registry, exports `scrape()`, `resolve()` |
| `scrapers/src/scraper/selectors.json` | Platform metadata (fetchMethod, notes) |
| `scrapers/src/detect.ts` | `detectPlatform()` hostname mapping (`HOSTNAME_MAP`) |
| `scrapers/src/worker.ts` | Batch worker; has a `platforms` allow-list |
| `server/src/api/routes/platforms.ts` | API display names |
| `web/src/components/StoreBadge.tsx` | Frontend badge colors |
| `web/src/components/StoreDrawer.tsx` | Frontend drawer store colors |
| `web/src/pages/Home.tsx` | Hero section platform list |
| `scrapers/tests.json` | Live test URLs for integration tests |
| `scrapers/__tests__/scraper.test.ts` | Integration test runner |

---

## Checklist (copy when implementing)

- [ ] Investigate site — determine fetch strategy and price source
- [ ] Create `scrapers/src/scraper/platforms/{platform}.ts` with complete class
- [ ] Add entry to `scrapers/src/scraper/selectors.json`
- [ ] Register in `scrapers/src/scraper/index.ts` (import + registry)
- [ ] Add hostname(s) to `HOSTNAME_MAP` in `scrapers/src/detect.ts`
- [ ] Add platform key to the `platforms` allow-list in `scrapers/src/worker.ts`
- [ ] (session strategy only) Add `CONFIGS['{platform}']` in `scrapers/src/scraper/session-manager.ts`
- [ ] Add display name to `server/src/api/routes/platforms.ts`
- [ ] Add colors to `web/src/components/StoreBadge.tsx`
- [ ] Add colors to `web/src/components/StoreDrawer.tsx`
- [ ] Add to `PLATFORMS` array in `web/src/pages/Home.tsx`
- [ ] Add test URL to `scrapers/tests.json`
- [ ] Run single-URL test to verify extraction works
- [ ] Run full test suite: `pnpm test` (browser/session platforms: `docker compose exec scrapers npx jest --config jest.config.ts`)
- [ ] Verify TypeScript compiles: `pnpm typecheck` (workspace) and `cd web && npx tsc -b` (frontend)
