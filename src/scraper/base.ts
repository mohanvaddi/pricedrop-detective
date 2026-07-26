import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
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

export async function fetchPageWithBrowser(url: string): Promise<cheerio.CheerioAPI> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: DEFAULT_USER_AGENT,
      locale: 'en-IN',
      extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
