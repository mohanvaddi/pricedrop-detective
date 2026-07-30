import * as cheerio from 'cheerio';
import { BaseScraper, fetchPageWithBrowser } from '../base';

/**
 * JioMart scraper — uses Playwright with domcontentloaded.
 * JioMart requires a delivery pincode to show prices; products show price=0
 * from IPs without a detectable Indian delivery zone.
 *
 * URL canonical: /product/name-slug-NUMERIC_ID → jiomart:NUMERIC_ID
 */
export class JioMartScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      const segments = u.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1] ?? '';
      const numMatch = last.match(/-(\d{8,})$/);
      if (numMatch) return `jiomart:${numMatch[1]!}`;
      return `jiomart:${last}`;
    } catch {
      return url;
    }
  }

  override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    return fetchPageWithBrowser(url, 'domcontentloaded');
  }

  extractPrice($: cheerio.CheerioAPI): number {
    const html = $.html();
    // data-price attribute (non-zero)
    const priceEl = $('[data-price]').first().attr('data-price');
    if (priceEl) {
      const p = parseFloat(priceEl.replace(/,/g, ''));
      if (p > 0) return Math.round(p);
    }
    // JSON-LD
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
    // Inline price patterns
    const patterns = [/"selling_price":"?([1-9]\d+\.?\d*)"?/, /"sp":"?([1-9]\d+\.?\d*)"?/, /"price":"?([1-9]\d+\.?\d*)"?/];
    for (const pat of patterns) {
      const m = html.match(pat);
      if (m) {
        const p = Math.round(parseFloat(m[1]!));
        if (p > 0) return p;
      }
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
    return title.replace(/\s*[-–|]\s*JioMart\s*$/i, '').trim() || null;
  }
}

