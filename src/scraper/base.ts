import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { chromium } from 'playwright';
import { CustomError } from '../../constants/error';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

/**
 * Fetch a page by executing the system `curl` binary with headers/cookies parsed
 * from a reference curl command file (e.g. ajio_curl.txt exported from DevTools).
 * This bypasses TLS-fingerprint-based bot detection that blocks Node.js HTTP clients.
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
  const headerArgs = [...curlTemplate.matchAll(/-H '([^']+)'/g)]
    .map((m) => m[1]!)
    .filter((h) => !/^(host|content-length):/i.test(h))
    .map((h) => `-H ${JSON.stringify(h)}`)
    .join(' ');

  // Extract -b cookies
  const cookieMatch = curlTemplate.match(/-b '([^']+)'/);
  const cookieArg = cookieMatch ? `-b ${JSON.stringify(cookieMatch[1]!)}` : '';

  const cmd = `curl -s --max-time 30 --http2 ${cookieArg} ${headerArgs} ${JSON.stringify(url)}`;

  const html = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (html.includes('Access Denied') && html.length < 5000) {
    throw new CustomError(
      'curl fetch returned Access Denied — the session cookies in the curl file have expired. Refresh by pasting a new "Copy as cURL" export.',
      'SessionExpired',
    );
  }
  return cheerio.load(html);
}

export async function fetchPageWithBrowser(url: string, waitUntil: 'domcontentloaded' | 'networkidle' | 'load' = 'domcontentloaded'): Promise<cheerio.CheerioAPI> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  try {
    const context = await browser.newContext({
      userAgent: DEFAULT_USER_AGENT,
      locale: 'en-IN',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-IN,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });
    // Hide automation indicators
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil, timeout: 45000 });
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

  /** Template method — orchestrates fetch → extract. */
  async scrape(url: string): Promise<{ currentPrice: number; title: string | null; thumbnailUrl: string | null }> {
    const $ = await this.fetchPage(url);
    const currentPrice = this.extractPrice($);
    const title = this.extractTitle($);
    const thumbnailUrl = this.extractThumbnail($);
    return { currentPrice, title, thumbnailUrl };
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
