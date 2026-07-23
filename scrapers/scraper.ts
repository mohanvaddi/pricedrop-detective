import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { CustomError } from '../lib/custom.error';
import selectorsConfig from './selectors.json';

export type Platform = keyof typeof selectorsConfig;

const CURRENCY_REGEX = /[₹$,]/g;
const NUMERIC_REGEX = /^[0-9]+$/;

function stripHtml(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z]+;/g, '');
}

export async function fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  const client = axios.create();
  axiosRetry(client, { retries: 5 });
  const { data } = await client.get<string>(url);
  return cheerio.load(data);
}

export function extractPrice(platform: Platform, $: cheerio.CheerioAPI): number {
  const selectors = selectorsConfig[platform]?.price;
  if (!selectors || selectors.length === 0) {
    throw new CustomError(`No price selectors configured for platform: ${platform}`, 'SelectorsNotFound');
  }

  for (const selector of selectors) {
    const raw = $(selector).html();
    if (!raw) continue;

    const cleaned = raw.replace(CURRENCY_REGEX, '').trim();
    if (NUMERIC_REGEX.test(cleaned)) {
      return parseInt(cleaned, 10);
    }
  }

  throw new CustomError('Unable to extract price', 'PriceNotFound');
}

export function extractTitle(platform: Platform, $: cheerio.CheerioAPI): string | null {
  const selectors = selectorsConfig[platform]?.title;
  if (!selectors) return null;

  for (const selector of selectors) {
    const raw = $(selector).html();
    if (raw && raw.trim() !== '') {
      return stripHtml(raw.trim());
    }
  }

  return null;
}

export async function scrape(platform: Platform, url: string): Promise<{ currentPrice: number; title: string | null }> {
  const $ = await fetchPage(url);
  const currentPrice = extractPrice(platform, $);
  const title = extractTitle(platform, $);
  return { currentPrice, title };
}
