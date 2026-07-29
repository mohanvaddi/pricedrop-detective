import * as cheerio from 'cheerio';
import { BaseScraper } from '../base';

/**
 * Decathlon India scraper.
 * Price and title are in the JSON-LD <script> block with @type:"Product".
 * Product ID is the numeric segment in the URL: /p/8326403/name
 */
export class DecathlonScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    // /p/8326403/product-name
    const match = url.match(/\/p\/(\d{5,})\//);
    if (match) return `decathlon:${match[1]!}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  extractPrice($: cheerio.CheerioAPI): number {
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
    this.throwPriceNotFound();
  }

  extractTitle($: cheerio.CheerioAPI): string | null {
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
    return title || null;
  }
}
