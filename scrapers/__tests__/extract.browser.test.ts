import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

jest.mock('../src/scraper/base', () => {
  const actual = jest.requireActual('../src/scraper/base');
  return { ...actual, fetchPageWithBrowser: jest.fn() };
});

import * as base from '../src/scraper/base';
import { AmazonScraper } from '../src/scraper/platforms/amazon';

const mockFetch = base.fetchPageWithBrowser as jest.MockedFunction<typeof base.fetchPageWithBrowser>;

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'amazon.html'), 'utf8');
const scraper = new AmazonScraper();
const $ = cheerio.load(fixture);

describe('AmazonScraper (browser strategy) — extraction', () => {
  it('extracts the price from .priceToPay .a-price-whole', () => {
    expect(scraper.extractPrice($)).toBe(4499);
  });

  it('extracts the title from #productTitle', () => {
    expect(scraper.extractTitle($)).toBe('Echo Dot (5th Gen) Smart Speaker with Alexa');
  });

  it('extracts the thumbnail from #landingImage', () => {
    expect(scraper.extractThumbnail($)).toBe('https://m.media-amazon.com/images/main-product.jpg');
  });

  it('canonicalizes to amazon:<ASIN>', () => {
    expect(scraper.canonicalizeUrl('https://www.amazon.in/Sony/dp/B09XS7JWHH?ref=x')).toBe('amazon:B09XS7JWHH');
  });
});

describe('AmazonScraper (browser strategy) — scrape() routing', () => {
  it('routes fetchPage through fetchPageWithBrowser', async () => {
    mockFetch.mockResolvedValue($);
    const result = await scraper.scrape('https://www.amazon.in/Sony/dp/B09XS7JWHH');
    expect(mockFetch).toHaveBeenCalledWith('https://www.amazon.in/Sony/dp/B09XS7JWHH');
    expect(result.currentPrice).toBe(4499);
    expect(result.title).toBe('Echo Dot (5th Gen) Smart Speaker with Alexa');
    expect(result.thumbnailUrl).toBe('https://m.media-amazon.com/images/main-product.jpg');
  });
});
