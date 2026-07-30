/**
 * Quick manual test of price/title scraping for a given product URL.
 * Edit the `url` below and run: npx tsx scrapers/scripts/test-selectors.ts
 */

import { scrape } from '../src/scraper';
import { detectPlatform } from '../src/detect';

async function main() {
  const url =
    'https://www.flipkart.com/apple-iphone-13-blue-128-gb/p/itm6c601e0a58b3c?pid=MOBG6VF5SMXPNQHG';

  const platform = detectPlatform(url);
  if (!platform) {
    console.error('Could not detect platform for URL');
    return;
  }
  const resp = await scrape(platform, url);
  console.log({ platform, ...resp });
}

main().catch((error) => {
  console.error(error);
});
