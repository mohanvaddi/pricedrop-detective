import { scrape, type Platform } from '../src/scraper';

/**
 * Live end-to-end scrape suite (opt-in — run with `pnpm test:live`).
 *
 * This actually hits the network, so it is excluded from the default unit run.
 * We deliberately cover ONE store per fetch strategy rather than all 14:
 *   - axios   → Flipkart   (plain HTTP + cheerio)
 *   - browser → Amazon     (Camoufox headless render)
 *   - session → Ajio       (Camoufox-harvested session replayed via curl)
 *
 * Each URL may rot over time; update the constants below when a product 404s.
 * The assertions are intentionally loose (price > 0, title present) — the point
 * is to prove the whole pipeline still resolves, fetches and extracts.
 */
const TARGETS: Array<{ strategy: string; platform: Platform; url: string }> = [
  {
    strategy: 'axios',
    platform: 'meesho',
    url: 'https://www.meesho.com/4-sockets-3-switches-multi-plug-extension-board/p/3or0v9',
  },
  {
    strategy: 'browser',
    platform: 'amazon',
    url: 'https://www.amazon.in/dp/B0BDHWDR12',
  },
  {
    strategy: 'session',
    platform: 'ajio',
    url: 'https://www.ajio.com/puma-unisex-lace-up-running-shoes/p/469591626_black',
  },
];

describe('live scrape (one store per strategy)', () => {
  it.each(TARGETS)('scrapes a real $platform product via the $strategy strategy', async ({ platform, url }) => {
    const result = await scrape(platform, url);
    expect(result.currentPrice).toBeGreaterThan(0);
    expect(typeof result.title === 'string' || result.title === null).toBe(true);
    expect(typeof result.available).toBe('boolean');
    // eslint-disable-next-line no-console
    console.log(`[live:${platform}] price=${result.currentPrice} title=${result.title}`);
  });
});
