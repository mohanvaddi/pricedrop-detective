import * as cheerio from 'cheerio';
import { BaseScraper, fetchPageWithBrowser, stripHtml } from '../base';
import selectorsConfig from '../selectors.json';

const CURRENCY_REGEX = /[₹$,]/g;
const NUMERIC_REGEX = /^[0-9]+$/;

export class AmazonScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    // Extract ASIN — the stable 10-char product identifier in Amazon URLs
    const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (match) return `amazon:${match[1]!}`;
    const u = new URL(url);
    return u.origin + u.pathname;
  }

  override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    return fetchPageWithBrowser(url);
  }

  extractPrice($: cheerio.CheerioAPI): number {
    const selectors = selectorsConfig.amazon.price;
    for (const selector of selectors) {
      const raw = $(selector).html();
      if (!raw) continue;
      const cleaned = raw.replace(CURRENCY_REGEX, '').trim();
      if (NUMERIC_REGEX.test(cleaned)) return parseInt(cleaned, 10);
    }
    this.throwPriceNotFound();
  }

  extractTitle($: cheerio.CheerioAPI): string | null {
    for (const selector of selectorsConfig.amazon.title) {
      const raw = $(selector).html();
      if (raw && raw.trim() !== '') return stripHtml(raw.trim());
    }
    return null;
  }
}
