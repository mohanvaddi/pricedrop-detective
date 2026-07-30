import * as cheerio from 'cheerio';
import { BaseScraper, fetchPageWithBrowser } from '../base';

/**
 * Blinkit scraper — uses Playwright with domcontentloaded. Must NOT use
 * networkidle (Blinkit has background requests that prevent networkidle from
 * ever resolving).
 *
 * Price and title come from JSON-LD @type:Product in the SSR page.
 *
 * URL canonical: /prn/{slug}/prid/{ID} → blinkit:{ID}
 */
export class BlinkitScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    const match = url.match(/\/prid\/(\d+)\/?(?:[?#].*)?$/);
    if (match) return `blinkit:${match[1]!}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    return fetchPageWithBrowser(url, 'domcontentloaded');
  }

  extractPrice($: cheerio.CheerioAPI): number {
    const html = $.html();
    // JSON-LD Product
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
    // Inline patterns
    const patterns = [/"price":(\d+)/, /"mrp":(\d+)/];
    for (const pat of patterns) {
      const m = html.match(pat);
      if (m) {
        const p = parseInt(m[1]!, 10);
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
    return title.replace(/\s+Price\s*-.*$/i, '').replace(/\s*[-–|]\s*Blinkit\s*$/i, '').trim() || null;
  }
}
