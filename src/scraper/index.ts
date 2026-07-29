import * as cheerio from 'cheerio';
import { CustomError } from '../../constants/error';
import { BaseScraper } from './base';
import { AjioScraper } from './platforms/ajio';
import { AmazonScraper } from './platforms/amazon';
import { BigBasketScraper } from './platforms/bigbasket';
import { BlinkitScraper } from './platforms/blinkit';
import { CromaScraper } from './platforms/croma';
import { DecathlonScraper } from './platforms/decathlon';
import { FlipkartScraper } from './platforms/flipkart';
import { IkeaScraper } from './platforms/ikea';
import { JioMartScraper } from './platforms/jiomart';
import { LenskartScraper } from './platforms/lenskart';
import { MeeshoScraper } from './platforms/meesho';
import { MyntraScraper } from './platforms/myntra';
import { NykaaFashionScraper } from './platforms/nykaafashion';
import { TataCliqScraper } from './platforms/tatacliq';
import selectorsConfig from './selectors.json';

export type Platform = keyof typeof selectorsConfig;

const registry: Record<Platform, BaseScraper> = {
  ajio: new AjioScraper(),
  amazon: new AmazonScraper(),
  bigbasket: new BigBasketScraper(),
  blinkit: new BlinkitScraper(),
  croma: new CromaScraper(),
  decathlon: new DecathlonScraper(),
  flipkart: new FlipkartScraper(),
  ikea: new IkeaScraper(),
  jiomart: new JioMartScraper(),
  lenskart: new LenskartScraper(),
  meesho: new MeeshoScraper(),
  myntra: new MyntraScraper(),
  nykaafashion: new NykaaFashionScraper(),
  tatacliq: new TataCliqScraper(),
};

export function resolve(platform: Platform): BaseScraper {
  const scraper = registry[platform];
  if (!scraper) throw new CustomError(`No scraper registered for platform: ${platform}`, 'PlatformNotSupported');
  return scraper;
}

export function canonicalizeUrl(platform: Platform, url: string): string {
  return resolve(platform).canonicalizeUrl(url);
}

export async function fetchPage(platform: Platform, url: string): Promise<cheerio.CheerioAPI> {
  return resolve(platform).fetchPage(url);
}

export function extractPrice(platform: Platform, $: cheerio.CheerioAPI): number {
  return resolve(platform).extractPrice($);
}

export function extractTitle(platform: Platform, $: cheerio.CheerioAPI): string | null {
  return resolve(platform).extractTitle($);
}

export function extractThumbnail(platform: Platform, $: cheerio.CheerioAPI): string | null {
  return resolve(platform).extractThumbnail($);
}

export async function scrape(
  platform: Platform,
  url: string,
): Promise<{ currentPrice: number; title: string | null; thumbnailUrl: string | null }> {
  return resolve(platform).scrape(url);
}
