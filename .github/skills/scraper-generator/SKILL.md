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
npx ts-node -e "
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
| Price only appears after JavaScript execution | **browser (Playwright)** | `fetchPageWithBrowser(url, waitUntil)` |
| Site uses TLS fingerprinting (blocks Node.js entirely) | **session-based curl** | `fetchPageWithCurl(url, curlFilePath)` |

**Priority: Always prefer axios over browser** — it's 10x faster, uses no memory for Chromium, and works in CI.

### 2. Determine URL Canonicalization

Find the product ID pattern in URLs:
- Amazon: `/dp/B0XXXXXX` → `amazon:B0XXXXXX`
- Meesho: `/product-name/p/3or0v9` → `meesho:3or0v9`
- Decathlon: `/p/8326403/name` → `decathlon:8326403`

The canonical form is `{platform}:{product_id}`. Used for deduplication.

### 3. Create the Scraper File

Create `src/scraper/platforms/{platform}.ts`:

```typescript
import * as cheerio from 'cheerio';
import { BaseScraper } from '../base';
// Import the appropriate fetch helper if overriding fetchPage:
// import { fetchPageWithMobileAxios, fetchPageWithBrowser, fetchPageWithCurl } from '../base';

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

#### a) `src/scraper/selectors.json`

Add entry (alphabetical order):

```json
"{platform}": {
  "fetchMethod": "axios",
  "price": [],
  "title": [],
  "note": "Brief description of extraction strategy"
}
```

Valid `fetchMethod` values: `"axios"`, `"browser"`, `"curl"`

#### b) `src/scraper/index.ts`

Add import and registry entry:

```typescript
import { {PlatformName}Scraper } from './platforms/{platform}';

// In registry object (alphabetical):
{platform}: new {PlatformName}Scraper(),
```

#### c) `src/constants/schema.ts`

Add hostname mapping to `HOSTNAME_MAP` array:

```typescript
['{hostname}.com', '{platform}'],
```

Place more specific hostnames before generic ones (e.g., `nykaafashion.com` before `nykaa.com`).

#### d) `src/api/routes/platforms.ts`

Add display name to `PLATFORM_NAMES`:

```typescript
{platform}: '{Display Name}',
```

#### e) `web/src/components/StoreBadge.tsx`

Add to `STORE_META`:

```typescript
{platform}: { label: '{Display Name}', color: 'bg-{color}-100 text-{color}-800 border-{color}-200' },
```

#### f) `web/src/components/StoreDrawer.tsx`

Add to `STORE_COLORS`:

```typescript
{platform}: 'bg-{color}-100 text-{color}-800',
```

#### g) `web/src/pages/Home.tsx`

Add to the `PLATFORMS` array:

```typescript
const PLATFORMS = [..., '{Display Name}'];
```

### 5. Add Test URL

Add a product URL to `tests.json`:

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
npx ts-node -e "
import { scrape } from './src/scraper';
import { detectPlatform } from './src/constants/schema';

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
npx jest __tests__/scraper.test.ts --testTimeout=120000
```

### Debug a specific extraction issue

```bash
npx ts-node -e "
import { resolve } from './src/scraper';
import { detectPlatform } from './src/constants/schema';

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

### Strategy 3: Browser (Playwright)

**When to use:** Price is only available after JavaScript execution (SPA, React hydration).

```typescript
override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  return fetchPageWithBrowser(url, 'domcontentloaded');
  // Options: 'domcontentloaded' | 'networkidle' | 'load'
}
```

**waitUntil guidance:**
- `'domcontentloaded'` — fastest, use when data is in SSR HTML or early hydration
- `'load'` — waits for images/resources; rarely needed for price extraction
- `'networkidle'` — waits for no network activity; **avoid if site has WebSockets/polling** (e.g., Blinkit — use domcontentloaded instead)

**Pros:** Works for any site, executes JS fully.
**Cons:** Slow (10-45s), requires Chromium installed, heavy on memory. Not ideal for scheduled tracking.
**Used by:** Amazon, Blinkit, JioMart.

### Strategy 4: Session-based Curl

**When to use:** Site uses TLS fingerprinting that detects Node.js HTTP clients (Akamai Bot Manager Advanced). Even Playwright gets blocked.

```typescript
override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  return fetchPageWithCurl(url, path.join(__dirname, '../../curl-sessions/{platform}_curl.txt'));
}
```

**Setup:** The user must export a "Copy as cURL" from browser DevTools and save it as the curl file. Cookies expire periodically and need manual refresh.

**Pros:** Bypasses even advanced TLS fingerprinting.
**Cons:** Requires manual cookie refresh, not automatable long-term.
**Used by:** Ajio.

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
- If that fails, try browser
- Last resort: session-based curl

### 5. Location-gated pricing
Some sites (JioMart) return price=0 without Indian IP. The scraper code is correct but will fail from non-Indian infrastructure. Document this in the `note` field of selectors.json.

### 6. networkidle timeout
If Playwright hangs for 45+ seconds, the site likely has persistent connections (WebSockets, event streams). Switch to `'domcontentloaded'`.

### 7. Frontend constants/types.ts
Never import from `drizzle-orm` or any backend-only module in `constants/types.ts` — it's shared with the frontend Vite build.

---

## File Reference

| File | Purpose |
|------|---------|
| `src/scraper/base.ts` | BaseScraper class + fetch helpers |
| `src/scraper/platforms/{platform}.ts` | Each platform's scraper implementation |
| `src/scraper/index.ts` | Scraper registry, exports `scrape()`, `resolve()` |
| `src/scraper/selectors.json` | Platform metadata (fetchMethod, notes) |
| `src/constants/schema.ts` | `detectPlatform()` hostname mapping + zod DTO |
| `src/api/routes/platforms.ts` | API display names |
| `web/src/components/StoreBadge.tsx` | Frontend badge colors |
| `web/src/components/StoreDrawer.tsx` | Frontend drawer store colors |
| `web/src/pages/Home.tsx` | Hero section platform list |
| `tests.json` | Live test URLs for integration tests |
| `__tests__/scraper.test.ts` | Integration test runner |

---

## Checklist (copy when implementing)

- [ ] Investigate site — determine fetch strategy and price source
- [ ] Create `src/scraper/platforms/{platform}.ts` with complete class
- [ ] Add entry to `src/scraper/selectors.json`
- [ ] Register in `src/scraper/index.ts` (import + registry)
- [ ] Add hostname(s) to `HOSTNAME_MAP` in `src/constants/schema.ts`
- [ ] Add display name to `src/api/routes/platforms.ts`
- [ ] Add colors to `web/src/components/StoreBadge.tsx`
- [ ] Add colors to `web/src/components/StoreDrawer.tsx`
- [ ] Add to `PLATFORMS` array in `web/src/pages/Home.tsx`
- [ ] Add test URL to `tests.json`
- [ ] Run single-URL test to verify extraction works
- [ ] Run full test suite: `npx jest __tests__/scraper.test.ts --testTimeout=120000`
- [ ] Verify TypeScript compiles: `npx tsc --noEmit` (backend) and `cd web && npx tsc -b` (frontend)
