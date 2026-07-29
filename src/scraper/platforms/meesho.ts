import * as cheerio from 'cheerio';
import { BaseScraper, fetchPageWithMobileAxios } from '../base';

/**
 * Meesho scraper — Akamai WAF blocks desktop HTTP clients but allows Android
 * mobile user-agents. Uses axios with an Android mobile UA.
 *
 * Price and title come from JSON-LD @type:Product after the SSR response.
 *
 * URL canonical: product slug + short ID, e.g. /product-name/p/3or0v9 → meesho:3or0v9
 */
export class MeeshoScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    const match = url.match(/\/p\/([a-z0-9]+)\/?(?:[?#].*)?$/i);
    if (match) return `meesho:${match[1]!.toLowerCase()}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    return fetchPageWithMobileAxios(url, 'android');
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
    return title.replace(/\s*[-–|]\s*Meesho\s*$/i, '').trim() || null;
  }
}
