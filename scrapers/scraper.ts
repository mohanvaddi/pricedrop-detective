import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { CustomError } from '../lib/custom.error';
import selectorsConfig from './selectors.json';

export type Platform = keyof typeof selectorsConfig;

const CURRENCY_REGEX = /[₹$,]/g;
const NUMERIC_REGEX = /^[0-9]+$/;

function stripHtml(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z]+;/g, '');
}

export async function fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  const client = axios.create({
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-IN,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });
  axiosRetry(client, { retries: 5 });
  const { data } = await client.get<string>(url);
  return cheerio.load(data);
}

/**
 * Flipkart embeds all product data in a server-side JSON blob:
 *   <script id="is_script">window.__INITIAL_STATE__ = {...}</script>
 *
 * Extracting from JSON is more reliable than CSS class selectors
 * because Flipkart's obfuscated class names change on every deploy.
 */
function extractFromFlipkartJSON($: cheerio.CheerioAPI): { price: number | null; title: string | null } {
  const script = $('#is_script').html();
  if (!script) return { price: null, title: null };

  const priceMatch = script.match(/"finalPrice":(\d+)/);
  // The schema array at the root level contains structured product data
  const titleMatch = script.match(/"schema":\[{"name":"((?:[^"\\]|\\.)*)"/);

  const price = priceMatch ? parseInt(priceMatch[1]!, 10) : null;
  const rawTitle = titleMatch ? titleMatch[1] : null;
  // Decode unicode escapes like \u002f → /
  const title = rawTitle
    ? rawTitle.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    : null;

  return { price, title };
}

export function extractPrice(platform: Platform, $: cheerio.CheerioAPI): number {
  // Flipkart: prefer JSON extraction — CSS class names are unstable
  if (platform === 'flipkart') {
    const { price } = extractFromFlipkartJSON($);
    if (price !== null && price > 0) return price;
  }

  const selectors = selectorsConfig[platform]?.price;
  if (!selectors || selectors.length === 0) {
    throw new CustomError(`No price selectors configured for platform: ${platform}`, 'SelectorsNotFound');
  }

  for (const selector of selectors) {
    const raw = $(selector).html();
    if (!raw) continue;

    const cleaned = raw.replace(CURRENCY_REGEX, '').trim();
    if (NUMERIC_REGEX.test(cleaned)) {
      return parseInt(cleaned, 10);
    }
  }

  throw new CustomError('Unable to extract price', 'PriceNotFound');
}

export function extractTitle(platform: Platform, $: cheerio.CheerioAPI): string | null {
  // Flipkart: prefer JSON extraction — CSS class names are unstable
  if (platform === 'flipkart') {
    const { title } = extractFromFlipkartJSON($);
    if (title) return title;
  }

  const selectors = selectorsConfig[platform]?.title;
  if (!selectors) return null;

  for (const selector of selectors) {
    const raw = $(selector).html();
    if (raw && raw.trim() !== '') {
      return stripHtml(raw.trim());
    }
  }

  return null;
}

export async function scrape(platform: Platform, url: string): Promise<{ currentPrice: number; title: string | null }> {
  const $ = await fetchPage(url);
  const currentPrice = extractPrice(platform, $);
  const title = extractTitle(platform, $);
  return { currentPrice, title };
}
