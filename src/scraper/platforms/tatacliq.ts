import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { BaseScraper } from '../base';

/**
 * TataCliq scraper — calls the internal product details API with a session
 * cookie obtained from the homepage. Falls back to browser rendering if the
 * API fails (e.g. session issues or network blocks).
 *
 * Key fields:
 *   - Price:  winningSellerPrice.value  (current selling price)
 *   - Title:  productName
 *   - Image:  first galleryImagesList entry (key="product")
 */

const BASE_URL = 'https://www.tatacliq.com';
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

interface WinningSellerPrice {
  value: number;
  doubleValue: number;
}

interface ProductDetails {
  status: string;
  productName?: string;
  productTitle?: string;
  winningSellerPrice?: WinningSellerPrice;
  mrpPrice?: WinningSellerPrice;
  galleryImagesList?: Array<{ galleryImages: Array<{ key: string; value: string }> }>;
}

/** Extract the lowercase product ID from a TataCliq URL (e.g. mp000000026439094). */
function extractProductId(url: string): string | null {
  const match = url.match(/\/p-([a-z0-9]+)/i);
  return match ? match[1]!.toLowerCase() : null;
}

async function fetchProductDetails(productId: string): Promise<ProductDetails | null> {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept-Language': 'en-IN,en;q=0.9',
      Accept: 'application/json, text/plain, */*',
      Referer: BASE_URL + '/',
    },
  });
  axiosRetry(client, { retries: 3 });

  // Obtain a session cookie by hitting the homepage first
  await client.get('/');

  const { data } = await client.get<ProductDetails>(
    `/marketplacewebservices/v2/mpl/products/productDetails/${productId}?isPwa=true&isMDE=true&isDynamicVar=true`,
  );

  if (data?.status === 'SUCCESS') return data;
  return null;
}

export class TataCliqScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    const id = extractProductId(url);
    if (id) return `tatacliq:${id}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  /** Fetch via the internal product API using a session cookie from the homepage. */
  override async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    const productId = extractProductId(url);
    if (!productId) this.throwPriceNotFound();

    const data = await fetchProductDetails(productId);
    if (!data) this.throwPriceNotFound();

    const json = JSON.stringify(data);
    return cheerio.load(`<script id="__tatacliq_product__" type="application/json">${json}</script>`);
  }

  extractPrice($: cheerio.CheerioAPI): number {
    const apiJson = $('#__tatacliq_product__').html();
    if (apiJson) {
      try {
        const data: ProductDetails = JSON.parse(apiJson);
        const price = data.winningSellerPrice?.value ?? data.mrpPrice?.value;
        if (price && price > 0) return price;
      } catch {}
    }
    this.throwPriceNotFound();
  }

  extractTitle($: cheerio.CheerioAPI): string | null {
    const apiJson = $('#__tatacliq_product__').html();
    if (apiJson) {
      try {
        const data: ProductDetails = JSON.parse(apiJson);
        return data.productName ?? data.productTitle ?? null;
      } catch {}
    }
    return null;
  }

  override extractThumbnail($: cheerio.CheerioAPI): string | null {
    const apiJson = $('#__tatacliq_product__').html();
    if (apiJson) {
      try {
        const data: ProductDetails = JSON.parse(apiJson);
        const firstGroup = data.galleryImagesList?.[0];
        const productImg = firstGroup?.galleryImages.find((i) => i.key === 'product');
        if (productImg?.value) {
          const src = productImg.value.startsWith('//') ? `https:${productImg.value}` : productImg.value;
          return src;
        }
      } catch {}
    }
    return super.extractThumbnail($);
  }
}
