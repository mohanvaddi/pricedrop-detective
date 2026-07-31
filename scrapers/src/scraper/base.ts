import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { launchCamoufox } from './browser';
import { CustomError } from '@pricedrop/shared/error';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const ANDROID_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export async function fetchPageWithAxios(url: string): Promise<cheerio.CheerioAPI> {
  const client = axios.create({
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept-Language': 'en-IN,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });
  axiosRetry(client, { retries: 5 });
  const { data } = await client.get<string>(url);
  return cheerio.load(data);
}

export async function fetchPageWithMobileAxios(url: string, device: 'android' | 'iphone' = 'android'): Promise<cheerio.CheerioAPI> {
  const ua = device === 'iphone' ? IPHONE_USER_AGENT : ANDROID_USER_AGENT;
  const client = axios.create({
    headers: {
      'User-Agent': ua,
      'Accept-Language': 'en-IN,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });
  axiosRetry(client, { retries: 5 });
  const { data } = await client.get<string>(url);
  return cheerio.load(data);
}

/**
 * Low-level fetch via the system `curl` binary. curl's TLS profile passes
 * fingerprint-based bot detection (e.g. Akamai on AJIO) that blocks Node.js
 * HTTP clients. Returns raw HTML; throws `SessionExpired` on an Access-Denied wall.
 */
export function curlFetch(url: string, opts: { cookie?: string | undefined; userAgent?: string | undefined; headers?: Record<string, string> | undefined } = {}): string {
  const args: string[] = [];
  if (opts.cookie) args.push(`-b ${JSON.stringify(opts.cookie)}`);
  if (opts.userAgent) args.push(`-H ${JSON.stringify(`user-agent: ${opts.userAgent}`)}`);
  for (const [k, v] of Object.entries(opts.headers ?? {})) {
    if (/^(host|content-length|cookie|user-agent):/i.test(`${k}:`)) continue;
    args.push(`-H ${JSON.stringify(`${k}: ${v}`)}`);
  }

  const cmd = `curl -s --max-time 30 --http2 --compressed ${args.join(' ')} ${JSON.stringify(url)}`;
  const html = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  // Detect an expired/challenged session: an explicit WAF block, a known Akamai
  // interstitial, or an abnormally small body where a real product page is large.
  const challenged = /Access Denied|Pardon Our Interruption|Reference #\d|Request unsuccessful|akamai/i.test(html);
  if ((challenged && html.length < 8000) || html.trim().length < 500) {
    throw new CustomError('curl fetch hit a WAF challenge — session cookies have expired.', 'SessionExpired');
  }
  return html;
}

/**
 * Fetch a page by executing the system `curl` binary with headers/cookies parsed
 * from a reference curl command file (e.g. ajio_curl.txt exported from DevTools).
 * Retained as a manual fallback; the automated session path is preferred.
 *
 * Cookie refresh: paste a new "Copy as cURL" export from DevTools into curlFilePath.
 */
export async function fetchPageWithCurl(url: string, curlFilePath: string): Promise<cheerio.CheerioAPI> {
  if (!fs.existsSync(curlFilePath)) {
    throw new CustomError(
      `curl session file not found: ${curlFilePath}. Export a working "Copy as cURL" from DevTools and save it there.`,
      'CurlFileNotFound',
    );
  }

  const curlTemplate = fs.readFileSync(curlFilePath, 'utf8');

  // Extract -H headers (excluding host/content-length which vary per request)
  const headers: Record<string, string> = {};
  for (const m of curlTemplate.matchAll(/-H '([^']+)'/g)) {
    const raw = m[1]!;
    const idx = raw.indexOf(':');
    if (idx === -1) continue;
    headers[raw.slice(0, idx).trim()] = raw.slice(idx + 1).trim();
  }

  // Extract -b cookies
  const cookieMatch = curlTemplate.match(/-b '([^']+)'/);
  const html = curlFetch(url, { cookie: cookieMatch?.[1], headers });
  return cheerio.load(html);
}

/**
 * Session/cookie-based fetch ("3rd scraping type"). AJIO's Akamai rejects bare
 * HTTP fetches, so the page is navigated in Camoufox while a solved cookie set
 * is injected (and refreshed) to skip re-solving where possible. Returns the
 * rendered HTML wrapped in cheerio.
 */
export async function fetchPageWithSession(url: string, platform: string): Promise<cheerio.CheerioAPI> {
  const { sessionManager } = await import('./session-manager');
  return cheerio.load(await sessionManager.render(platform, url));
}

export async function fetchPageWithBrowser(url: string, waitUntil: 'domcontentloaded' | 'networkidle' | 'load' = 'domcontentloaded'): Promise<cheerio.CheerioAPI> {
  const browser = await launchCamoufox();
  try {
    // Camoufox owns the fingerprint (user-agent, locale, navigator props), so
    // keep the context minimal — overriding userAgent here would desync the spoof.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil, timeout: 45000 });

    // Some sites (notably Amazon) serve an anti-bot interstitial with a
    // "Continue shopping" button instead of the product page. Clicking it lands
    // on the homepage but establishes session cookies, so we click through and
    // then re-navigate to the original URL. Retry a couple of times because the
    // interstitial can reappear.
    for (let attempt = 0; attempt < 3; attempt++) {
      const continueBtn = page.locator('button:has-text("Continue shopping"), input[type="submit"][value*="Continue"]').first();
      if ((await continueBtn.count()) === 0) break;
      await continueBtn.click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(1000);
      await page.goto(url, { waitUntil, timeout: 45000 });
    }

    const html = await page.content();
    return cheerio.load(html);
  } finally {
    await browser.close();
  }
}

export function stripHtml(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z]+;/g, '');
}

export abstract class BaseScraper {
  /**
   * Fetch the page and return a Cheerio instance.
   * Default implementation uses axios. Override for browser-based scraping.
   */
  async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    return fetchPageWithAxios(url);
  }

  abstract extractPrice($: cheerio.CheerioAPI): number;
  abstract extractTitle($: cheerio.CheerioAPI): string | null;

  /** Extract a product thumbnail URL from the page (OG image or first product image). */
  extractThumbnail($: cheerio.CheerioAPI): string | null {
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) return ogImage;
    return null;
  }

  /**
   * Best-effort stock detection. Defaults to in-stock; returns false only when
   * the page carries an explicit out-of-stock signal. Override per-platform for
   * more reliable detection.
   */
  extractAvailability($: cheerio.CheerioAPI): boolean {
    const html = $.html();
    // JSON-LD availability is the most reliable signal when present.
    for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try {
        const d = JSON.parse(m[1]!.trim());
        const items = Array.isArray(d) ? d : [d];
        for (const item of items) {
          const avail = item?.offers?.availability;
          if (typeof avail === 'string') {
            if (/OutOfStock|SoldOut|Discontinued/i.test(avail)) return false;
            if (/InStock|PreOrder|BackOrder|LimitedAvailability/i.test(avail)) return true;
          }
        }
      } catch {}
    }
    const text = $('body').text().toLowerCase();
    const oosSignals = ['out of stock', 'sold out', 'currently unavailable', 'notify me when', 'temporarily unavailable', 'coming soon'];
    if (oosSignals.some((s) => text.includes(s))) return false;
    return true;
  }

  /** Template method — orchestrates fetch → extract. */
  async scrape(url: string): Promise<{ currentPrice: number; title: string | null; thumbnailUrl: string | null; available: boolean }> {
    const $ = await this.fetchPage(url);
    const currentPrice = this.extractPrice($);
    const title = this.extractTitle($);
    const thumbnailUrl = this.extractThumbnail($);
    const available = this.extractAvailability($);
    return { currentPrice, title, thumbnailUrl, available };
  }

  /** Extract a canonical, stable identifier for the product. Used for deduplication hashing. */
  canonicalizeUrl(url: string): string {
    // Default: strip query string and fragment, keep origin + path
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  protected throwPriceNotFound(): never {
    throw new CustomError('Unable to extract price', 'PriceNotFound');
  }
}
