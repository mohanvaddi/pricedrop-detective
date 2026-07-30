import * as cheerio from 'cheerio';
import { BaseScraper } from '../base';

function extractFromJSON($: cheerio.CheerioAPI): { price: number | null; title: string | null } {
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

export class FlipkartScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      const pid = u.searchParams.get('pid');
      if (pid) return `flipkart:${pid}`;
      // Fallback: last path segment (usually contains product ID)
      const segments = u.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      return `flipkart:${last ?? u.pathname}`;
    } catch {
      return url;
    }
  }

  extractPrice($: cheerio.CheerioAPI): number {
    const { price } = extractFromJSON($);
    if (price !== null && price > 0) return price;
    this.throwPriceNotFound();
  }

  extractTitle($: cheerio.CheerioAPI): string | null {
    const { title } = extractFromJSON($);
    return title;
  }
}
