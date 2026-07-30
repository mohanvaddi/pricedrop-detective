import * as cheerio from 'cheerio';
import { BaseScraper } from '../base';
import selectorsConfig from '../selectors.json';

type JSONExtractionConfig = { source: string; priceFields: string[]; titleFields: string[] };

function extractFromJSONConfig(
  $: cheerio.CheerioAPI,
  cfg: JSONExtractionConfig,
): { price: number | null; title: string | null } {
  const text = cfg.source === 'html' ? $.html() : ($(`${cfg.source}`).html() ?? '');

  let price: number | null = null;
  for (const field of cfg.priceFields) {
    const m = text.match(new RegExp(`"${field}":(\\d+)`));
    if (m) {
      price = parseInt(m[1]!, 10);
      break;
    }
  }

  let title: string | null = null;
  for (const field of cfg.titleFields) {
    const m = text.match(new RegExp(`"${field}":"((?:[^"\\\\]|\\\\.)*)"`));
    if (m) {
      title = m[1]!.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
      break;
    }
  }

  return { price, title };
}

export class MyntraScraper extends BaseScraper {
  override canonicalizeUrl(url: string): string {
    // Myntra product URLs contain a numeric ID: /brand/name/12345678/buy
    const match = url.match(/\/(\d{6,})\//);
    if (match) return `myntra:${match[1]!}`;
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  private get cfg(): JSONExtractionConfig {
    return selectorsConfig.myntra.jsonExtraction as JSONExtractionConfig;
  }

  extractPrice($: cheerio.CheerioAPI): number {
    const { price } = extractFromJSONConfig($, this.cfg);
    if (price !== null && price > 0) return price;
    this.throwPriceNotFound();
  }

  extractTitle($: cheerio.CheerioAPI): string | null {
    const { title } = extractFromJSONConfig($, this.cfg);
    return title;
  }
}
