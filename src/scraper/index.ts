import * as cheerio from 'cheerio';
import { CustomError } from '../../constants/error';
import { BaseScraper } from './base';
import { AmazonScraper } from './platforms/amazon';
import { FlipkartScraper } from './platforms/flipkart';
import { MyntraScraper } from './platforms/myntra';
import selectorsConfig from './selectors.json';

export type Platform = keyof typeof selectorsConfig;

const registry: Record<Platform, BaseScraper> = {
  amazon: new AmazonScraper(),
  flipkart: new FlipkartScraper(),
  myntra: new MyntraScraper(),
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

export async function scrape(platform: Platform, url: string): Promise<{ currentPrice: number; title: string | null }> {
  return resolve(platform).scrape(url);
}
