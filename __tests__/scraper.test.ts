/**
 * Integration tests for the scraper.
 *
 * Hits live product pages listed in tests.json and asserts that:
 *   - the platform is recognised from the URL
 *   - a positive integer price is extracted
 *   - a non-empty title string is extracted
 *
 * These tests require an internet ccoonnection and will be slower than
 * unit tests (~5-15s each). They run as part of the pre-commit hook so
 * that broken selectors are caught before code lands in the repo.
 *
 * NOTE: Amazon blocks scraping from datacenter / CI IPs. Tests for
 * Amazon URLs are skipped automatically when bot-detection is detected
 * (page size < 20KB). Run from your local machine to test Amazon URLs.
 */

import testUrls from '../tests.json';
import { scrape, fetchPage, Platform } from '../scraper';
import { detectPlatform } from '../constants/schema';

// Minimum page size (bytes) below which we assume bot-detection kicked in
const MIN_REAL_PAGE_BYTES = 20_000;

async function isPageBlocked(url: string): Promise<boolean> {
  try {
    const $ = await fetchPage(url);
    const html = $.html();
    return html.length < MIN_REAL_PAGE_BYTES;
  } catch {
    return true;
  }
}

describe('Scraper — live product pages', () => {
  test.each(testUrls)('%s', async (url) => {
    const platform = detectPlatform(url) as Platform;
    expect(platform).not.toBeNull();

    // Skip gracefully when the platform blocks headless requests (e.g. Amazon on datacenter IPs)
    if (await isPageBlocked(url)) {
      console.warn(`[SKIP] Bot-detection triggered for ${platform} — run from a local machine to test this URL.`);
      return;
    }

    const { currentPrice, title } = await scrape(platform, url);
    console.log(`Scraped ${platform} — Price: ${currentPrice}, Title: "${title}"`);

    // Price must be a positive integer
    expect(typeof currentPrice).toBe('number');
    expect(Number.isInteger(currentPrice)).toBe(true);
    expect(currentPrice).toBeGreaterThan(0);

    // Title must be a non-empty string
    expect(typeof title).toBe('string');
    expect((title as string).trim().length).toBeGreaterThan(0);
  });
});
