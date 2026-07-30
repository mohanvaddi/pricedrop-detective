import * as cheerio from 'cheerio';
import { BaseScraper, fetchPageWithMobileAxios } from '../base';

/**
 * Croma scraper — Akamai WAF blocks desktop HTTP clients but allows Android
 * mobile user-agents. Uses axios with an Android mobile UA.
 *
 * Croma's JSON-LD contains literal newlines inside the description field which
 * makes it unparseable. Price is extracted via a targeted regex on the raw
 * JSON-LD string rather than full JSON.parse.
 *
 * URL canonical: /product-name/p/314450 → croma:314450
 */
export class CromaScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    const match = url.match(/\/p\/(\d{4,})\/?(?:[?#].*)?$/);
    if (match) return `croma:${match[1]!}`;
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
    // Try full JSON-LD parse first
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
      } catch {
        // JSON-LD may contain literal newlines in description — extract price via regex
        const raw = m[1]!;
        // Find offers section: "offers":{...} and extract price from within
        const offersPrice = /"offers"\s*:\s*\{[^}]*"price"\s*:\s*"?([\d.]+)"?/.exec(raw);
        if (offersPrice) {
          const p = Math.round(parseFloat(offersPrice[1]!));
          if (p > 0) return p;
        }
      }
    }
    const patterns = [/"offerPrice":(\d+)/, /"sellingPrice":(\d+)/, /"price":"(\d+\.?\d*)"/];
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
      } catch {
        // Regex fallback for name from malformed JSON-LD
        const raw = m[1]!;
        const nameMatch = /"name"\s*:\s*"([^"]+)"/.exec(raw);
        if (nameMatch) return nameMatch[1]!;
      }
    }
    const title = $('title').text().trim();
    return title.replace(/\s*[-–|]\s*(?:Buy\s+)?.*Online.*Croma\s*$/i, '').replace(/\s*Online.*$/i, '').trim() || null;
  }
}
