/**
 * Integration tests for the scraper.
 *
 * Hits live product pages listed in tests.json and asserts that:
 *   - the platform is recognised from the URL
 *   - a positive integer price is extracted
 *   - a non-empty title string is extracted
 *
 * These tests require an internet connection and will be slower than
 * unit tests (~5-15s each for axios, up to 60s for browser-based platforms).
 * They run as part of the pre-commit hook so that broken selectors are
 * caught before code lands in the repo.
 */

import testUrls from '../tests.json';
import { scrape, Platform } from '../src/scraper';
import { detectPlatform } from '../src/constants/schema';
import selectorsConfig from '../src/scraper/selectors.json';

type SelectorConfig = { fetchMethod?: 'browser' | 'axios'; price: string[]; title: string[] };

function getFetchMethod(platform: Platform): 'browser' | 'axios' {
  return (selectorsConfig[platform] as SelectorConfig)?.fetchMethod ?? 'axios';
}

describe('Scraper — live product pages', () => {
  test.each(testUrls)('%s', async (url) => {
    const platform = detectPlatform(url) as Platform;
    expect(platform).not.toBeNull();

    const fetchMethod = getFetchMethod(platform);

    const { currentPrice, title } = await scrape(platform, url);
    console.log(`[${fetchMethod}] Scraped ${platform} — Price: ${currentPrice}, Title: "${title}"`);

    // Price must be a positive integer
    expect(typeof currentPrice).toBe('number');
    expect(Number.isInteger(currentPrice)).toBe(true);
    expect(currentPrice).toBeGreaterThan(0);

    // Title must be a non-empty string
    expect(typeof title).toBe('string');
    expect((title as string).trim().length).toBeGreaterThan(0);
  });
});
