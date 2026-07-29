import * as cheerio from 'cheerio';
import { BaseScraper, fetchPageWithMobileAxios } from '../base';

/**
 * Nykaa Fashion scraper — returns 403 to desktop HTTP clients, but allows
 * iPhone mobile user-agents. Uses axios with an iPhone UA.
 *
 * Price and title come from JSON-LD @type:Product or __NEXT_DATA__.
 *
 * URL canonical: /product-name/p/26067377 → nykaafashion:26067377
 */
export class NykaaFashionScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    const match = url.match(/\/p\/(\d{5,})\/?(?:[?#].*)?$/);
    if (match) return `nykaafashion:${match[1]!}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    return fetchPageWithMobileAxios(url, 'iphone');
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
    const patterns = [/"discountedPrice":(\d+)/, /"price":(\d+)/, /"sellingPrice":(\d+)/];
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
    return title.replace(/\s*[-–|]\s*Nykaa\s*$/i, '').trim() || null;
  }
}
