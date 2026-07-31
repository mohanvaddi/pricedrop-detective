import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

// Mock axios so the default (axios) fetch path returns fixture HTML instead of
// hitting the network. FlipkartScraper uses BaseScraper's default fetchPage.
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'flipkart.html'), 'utf8');
const mockGet = jest.fn().mockResolvedValue({ data: fixture });
jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(() => ({ get: mockGet })) },
}));
jest.mock('axios-retry', () => ({ __esModule: true, default: jest.fn() }));

import { FlipkartScraper } from '../src/scraper/platforms/flipkart';

const scraper = new FlipkartScraper();
const $ = cheerio.load(fixture);

describe('FlipkartScraper (axios strategy) — extraction', () => {
  it('extracts the finalPrice from the embedded JSON', () => {
    expect(scraper.extractPrice($)).toBe(1299);
  });

  it('extracts + unicode-decodes the title from the schema block', () => {
    expect(scraper.extractTitle($)).toBe('Wildcraft 44 L Backpack - Blue');
  });

  it('canonicalizes to flipkart:<pid> when a pid is present', () => {
    expect(scraper.canonicalizeUrl('https://www.flipkart.com/x/p/itmabc?pid=BAGXYZ123&lid=9')).toBe('flipkart:BAGXYZ123');
  });

  it('falls back to the last path segment when there is no pid', () => {
    expect(scraper.canonicalizeUrl('https://www.flipkart.com/x/p/itmabc')).toBe('flipkart:itmabc');
  });
});

describe('FlipkartScraper (axios strategy) — scrape() routing', () => {
  it('fetches via axios and returns extracted price + title', async () => {
    const result = await scraper.scrape('https://www.flipkart.com/x/p/itmabc?pid=BAGXYZ123');
    expect(mockGet).toHaveBeenCalledWith('https://www.flipkart.com/x/p/itmabc?pid=BAGXYZ123');
    expect(result.currentPrice).toBe(1299);
    expect(result.title).toBe('Wildcraft 44 L Backpack - Blue');
    expect(result.available).toBe(true);
  });
});
