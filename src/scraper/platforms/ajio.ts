import * as cheerio from 'cheerio';
import * as path from 'path';
import { BaseScraper, fetchPageWithCurl } from '../base';

/**
 * Ajio scraper — uses the system curl binary with a pre-seeded session (ajio_curl.txt)
 * to bypass Akamai WAF TLS fingerprinting. Node.js HTTP clients are blocked by Akamai
 * regardless of headers; the curl binary has a different TLS profile that passes.
 *
 * Cookie refresh: in Chrome/Brave DevTools → Network tab → right-click any ajio.com
 * request → "Copy as cURL (bash)" → paste into ajio_curl.txt at the project root.
 *
 * Extraction strategy:
 *   1. window.__PRELOADED_STATE__.product.productDetails  (price.value, name)
 *   2. JSON-LD schema.org ProductGroup fallback           (offers.price, name)
 */

const CURL_FILE = path.resolve(process.cwd(), 'ajio_curl.txt');

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
    return fetchPageWithCurl(url, CURL_FILE);
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

