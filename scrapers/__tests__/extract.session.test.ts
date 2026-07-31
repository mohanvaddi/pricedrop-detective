import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

jest.mock('../src/scraper/base', () => {
  const actual = jest.requireActual('../src/scraper/base');
  return { ...actual, fetchPageWithSession: jest.fn() };
});

import * as base from '../src/scraper/base';
import { AjioScraper } from '../src/scraper/platforms/ajio';

const mockFetch = base.fetchPageWithSession as jest.MockedFunction<typeof base.fetchPageWithSession>;

const preloaded = fs.readFileSync(path.join(__dirname, 'fixtures', 'ajio.html'), 'utf8');
const jsonldOnly = fs.readFileSync(path.join(__dirname, 'fixtures', 'ajio-jsonld.html'), 'utf8');

const scraper = new AjioScraper();

describe('AjioScraper (session strategy) — __PRELOADED_STATE__ extraction', () => {
  const $ = cheerio.load(preloaded);

  it('extracts the price from productDetails.price.value', () => {
    expect(scraper.extractPrice($)).toBe(2795);
  });

  it('extracts the title from productDetails.name', () => {
    expect(scraper.extractTitle($)).toBe('Nike Downshifter 14 Running Shoes');
  });

  it("extracts the 'product' format image", () => {
    expect(scraper.extractThumbnail($)).toBe('https://assets.ajio.com/product.jpg');
  });
});

describe('AjioScraper (session strategy) — JSON-LD fallback', () => {
  const $ = cheerio.load(jsonldOnly);

  it('falls back to JSON-LD offers.price when no preloaded state', () => {
    expect(scraper.extractPrice($)).toBe(3499);
  });

  it('falls back to JSON-LD name', () => {
    expect(scraper.extractTitle($)).toBe('Puma Sneakers');
  });
});

describe('AjioScraper (session strategy) — canonicalizeUrl', () => {
  it('canonicalizes to ajio:<code> from the /p/ segment', () => {
    expect(scraper.canonicalizeUrl('https://www.ajio.com/puma-shoes/p/469123456_black?x=1')).toBe('ajio:469123456_black');
  });
});

describe('AjioScraper (session strategy) — scrape() routing', () => {
  it("routes fetchPage through fetchPageWithSession(url, 'ajio')", async () => {
    mockFetch.mockResolvedValue(cheerio.load(preloaded));
    const result = await scraper.scrape('https://www.ajio.com/puma-shoes/p/469123456_black');
    expect(mockFetch).toHaveBeenCalledWith('https://www.ajio.com/puma-shoes/p/469123456_black', 'ajio');
    expect(result.currentPrice).toBe(2795);
    expect(result.title).toBe('Nike Downshifter 14 Running Shoes');
  });
});
