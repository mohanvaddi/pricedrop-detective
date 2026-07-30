import * as cheerio from 'cheerio';
import { BaseScraper, fetchPageWithAxios } from '../base';

/**
 * BigBasket scraper — uses standard axios (site is accessible to Node clients).
 * Price comes from __NEXT_DATA__ → props.pageProps.productDetails.children[0].pricing.discount.prim_price.sp
 *
 * URL canonical: /pd/{ID}/ → bigbasket:{ID}
 */
export class BigBasketScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    const match = url.match(/\/pd\/(\d+)\//);
    if (match) return `bigbasket:${match[1]!}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    return fetchPageWithAxios(url);
  }

  extractPrice($: cheerio.CheerioAPI): number {
    const html = $.html();

    // Primary: __NEXT_DATA__ → productDetails.children[0].pricing.discount.prim_price.sp
    const ndMatch = /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (ndMatch) {
      try {
        const data = JSON.parse(ndMatch[1]!);
        const children: unknown[] = data?.props?.pageProps?.productDetails?.children;
        if (Array.isArray(children) && children.length > 0) {
          const child = children[0] as Record<string, unknown>;
          const pricing = child['pricing'] as Record<string, unknown> | undefined;
          const discount = pricing?.['discount'] as Record<string, unknown> | undefined;
          const primPrice = discount?.['prim_price'] as Record<string, unknown> | undefined;
          if (primPrice?.['sp']) {
            const p = parseInt(String(primPrice['sp']), 10);
            if (p > 0) return p;
          }
        }
      } catch {}
    }

    // Fallback: scan HTML for price patterns
    const patterns = [/"sp":"?(\d+)"?/, /"selling_price":"?(\d+)"?/, /"price":"?(\d+)"?/];
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

    // Try __NEXT_DATA__ → children[0] brand+desc+weight
    const ndMatch = /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (ndMatch) {
      try {
        const data = JSON.parse(ndMatch[1]!);
        const children: unknown[] = data?.props?.pageProps?.productDetails?.children;
        if (Array.isArray(children) && children.length > 0) {
          const child = children[0] as Record<string, unknown>;
          const brand = (child['brand'] as Record<string, unknown> | undefined)?.['name'] as string | undefined;
          const desc = child['desc'] as string | undefined;
          const w = child['w'] as string | undefined;
          const parts = [brand, desc, w].filter(Boolean);
          if (parts.length >= 2) return parts.join(' ');
        }
      } catch {}
    }

    const title = $('title').text().trim();
    return title.replace(/\s*[-–|]\s*bigbasket\s*$/i, '').trim() || null;
  }
}
