import * as cheerio from 'cheerio';
import { BaseScraper, fetchPageWithSession } from '../base';

/**
 * Ajio scraper — session/cookie-based ("3rd scraping type").
 *
 * Akamai WAF blocks Node.js HTTP clients by TLS fingerprint. We launch Camoufox
 * (stealth Firefox) once to harvest a WAF-approved session (cookies + UA), cache
 * it in Postgres, and replay it via the system `curl` binary for cheap fetches
 * until the session expires — then Camoufox regenerates it automatically. This
 * replaces the old manual ajio_curl.txt paste flow.
 *
 * Extraction strategy:
 *   1. window.__PRELOADED_STATE__.product.productDetails  (price.value, name)
 *   2. JSON-LD schema.org ProductGroup fallback           (offers.price, name)
 */

interface ProductDetails {
  price?: { value?: number };
  name?: string;
  images?: Array<{ format?: string; url?: string }>;
}

function extractFromPreloadedState(html: string): { price: number | null; title: string | null; imageUrl: string | null } {
  const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*([\s\S]*?);\s*<\/script>/);
  if (!match) return { price: null, title: null, imageUrl: null };
  try {
    const state = JSON.parse(match[1]!);
    const pd: ProductDetails | undefined = state?.product?.productDetails;
    const price = pd?.price?.value ?? null;
    const title = pd?.name ?? null;
    const imageUrl = pd?.images?.find((i) => i.format === 'product')?.url ?? null;
    return { price: price && price > 0 ? price : null, title, imageUrl };
  } catch {
    return { price: null, title: null, imageUrl: null };
  }
}

function extractFromJsonLd(html: string): { price: number | null; title: string | null; imageUrl: string | null } {
  for (const match of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(match[1]!.trim());
      if (d['@type'] === 'ProductGroup' || d['@type'] === 'Product') {
        const price = d.offers?.price ? parseInt(String(d.offers.price), 10) : null;
        const title = d.name ?? null;
        const imageUrl = typeof d.image === 'string' ? d.image : null;
        if (price && price > 0) return { price, title, imageUrl };
      }
    } catch {}
  }
  return { price: null, title: null, imageUrl: null };
}

export class AjioScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    const match = url.match(/\/p\/([^/?#]+)/);
    if (match) return `ajio:${match[1]!}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    return fetchPageWithSession(url, 'ajio');
  }

  extractPrice($: cheerio.CheerioAPI): number {
    const html = $.html();
    const { price: statePrice } = extractFromPreloadedState(html);
    if (statePrice) return statePrice;
    const { price: ldPrice } = extractFromJsonLd(html);
    if (ldPrice) return ldPrice;
    this.throwPriceNotFound();
  }

  extractTitle($: cheerio.CheerioAPI): string | null {
    const html = $.html();
    const { title: stateTitle } = extractFromPreloadedState(html);
    if (stateTitle) return stateTitle;
    const { title: ldTitle } = extractFromJsonLd(html);
    return ldTitle;
  }

  override extractThumbnail($: cheerio.CheerioAPI): string | null {
    const html = $.html();
    const { imageUrl: stateImg } = extractFromPreloadedState(html);
    if (stateImg) return stateImg;
    const { imageUrl: ldImg } = extractFromJsonLd(html);
    if (ldImg) return ldImg;
    return super.extractThumbnail($);
  }
}

