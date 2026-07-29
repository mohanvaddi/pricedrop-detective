import * as cheerio from 'cheerio';
import { BaseScraper } from '../base';

/**
 * IKEA India scraper.
 * Price lives in an inline `window.ikea` data object in the HTML:
 *   "prefixedProductId":"S29560086","price":11990
 * Title is cleanly in the <title> tag: "RELATERA desk sit/stand, white... - IKEA"
 * Article number (canonical ID) is embedded in the URL slug: /p/name-s29560086/
 */
export class IkeaScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    // Article number appears as last segment before optional trailing slash: /p/name-sNNNNNNNN/
    const match = url.match(/\/p\/[^/]+-s(\d{5,})\/?(?:[?#].*)?$/i);
    if (match) return `ikea:${match[1]!}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  extractPrice($: cheerio.CheerioAPI): number {
    const html = $.html();
    // "prefixedProductId":"S29560086","price":11990 — appears in the page's inline JS data
    const match = html.match(/"prefixedProductId":"[^"]+","price":(\d+)/);
    if (match) {
      const price = parseInt(match[1]!, 10);
      if (price > 0) return price;
    }
    // Fallback: JSON-LD offers.price
    for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try {
        const d = JSON.parse(m[1]!.trim());
        const items = Array.isArray(d) ? d : [d];
        for (const item of items) {
          if (item['@type'] === 'Product') {
            const p = parseInt(String(item.offers?.price ?? 0), 10);
            if (p > 0) return p;
          }
        }
      } catch {}
    }
    this.throwPriceNotFound();
  }

  extractTitle($: cheerio.CheerioAPI): string | null {
    // <title>RELATERA desk sit/stand, white, 90x60 cm - IKEA</title>
    const title = $('title').text().trim();
    if (title) return title.replace(/\s*[-–|]\s*IKEA\s*$/i, '').trim() || null;
    return null;
  }
}
