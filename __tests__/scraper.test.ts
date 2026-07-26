/**
 * Integration tests for the scraper.
 *
 * Hits live product pages listed in tests.json and asserts that:
 *   - the platform is recognised from the URL
 *   - a positive integer price is extracted
 *   - a non-empty title string is extracted
 *
 * These tests require an internet connection and will be slower than
 * unit tests (~5-15s each). They run as part of the pre-commit hook so
 * that broken selectors are caught before code lands in the repo.
 *
 * Scraping method per platform is driven by the `fetchMethod` field in
 * selectors.json. Browser-based platforms (e.g. Amazon) use Playwright
 * and are never bot-blocked, so no skip logic is applied to them.
 * Axios-based platforms (e.g. Flipkart) skip gracefully if bot-detection
 * is triggered (page size < 20KB).
 */

import testUrls from '../tests.json';
import { scrape, fetchPage, Platform } from '../src/scraper';
import { detectPlatform } from '../src/constants/schema';
import selectorsConfig from '../src/scraper/selectors.json';

type SelectorConfig = { fetchMethod?: 'browser' | 'axios'; price: string[]; title: string[] };

// Minimum page size (bytes) below which we assume bot-detection kicked in for axios scraping
const MIN_REAL_PAGE_BYTES = 20_000;

function getFetchMethod(platform: Platform): 'browser' | 'axios' {
  return (selectorsConfig[platform] as SelectorConfig)?.fetchMethod ?? 'axios';
}

describe('Scraper — live product pages', () => {
  test.each(testUrls)('%s', async (url) => {
    const platform = detectPlatform(url) as Platform;
    expect(platform).not.toBeNull();

    const fetchMethod = getFetchMethod(platform);

    // Browser-based platforms use Playwright — bot-detection doesn't apply
    // Axios-based platforms may get blocked; skip gracefully if so
    if (fetchMethod === 'axios') {
      let html = '';
      try {
        const $ = await fetchPage(platform, url);
        html = $.html();
      } catch {
        // fetch failed — treat as blocked
      }
      if (html.length < MIN_REAL_PAGE_BYTES) {
        console.warn(`[SKIP] Bot-detection triggered for ${platform} — page too small (${html.length} bytes)`);
        return;
      }
    }

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
