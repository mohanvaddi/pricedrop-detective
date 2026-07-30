import * as cheerio from 'cheerio';
import { BaseScraper } from '../base';

/**
 * Lenskart scraper.
 * Price and title are in the JSON-LD <script> with @type:"Product".
 * URL canonical ID is the product slug (everything before .html).
 *
 * Price structure: "Sales Price" entry has the lowest price (1200).
 * JSON-LD structure: offers.price = "1200" (cheapest variant).
 */
export class LenskartScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      // Slug is the last path segment without .html extension
      const slug = u.pathname.replace(/\.html$/i, '').replace(/^\//, '');
      return `lenskart:${slug}`;
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
            const rawPrice = item.offers.price ?? item.offers.lowPrice;
            const p = parseInt(String(rawPrice ?? 0), 10);
            if (p > 0) return p;
          }
        }
      } catch {}
    }
    // Fallback: __NEXT_DATA__ "Sales Price" entry
    const nextMatch = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextMatch) {
      const salesPrice = nextMatch[1]!.match(/"name":"Sales Price"[^}]*"price":(\d+)/);
      if (salesPrice) return parseInt(salesPrice[1]!, 10);
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
    return title.replace(/\s*[-–|]\s*Lenskart\s*$/i, '').trim() || null;
  }
}
