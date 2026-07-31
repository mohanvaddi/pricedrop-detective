jest.mock('@pricedrop/shared/db/products', () => ({
  findDueProducts: jest.fn(),
  updateLastScraped: jest.fn(),
  updateProductCategory: jest.fn(),
}));
jest.mock('@pricedrop/shared/db/prices', () => ({ findMetrics: jest.fn() }));
jest.mock('../src/scraper', () => {
  const actual = jest.requireActual('../src/scraper');
  return { ...actual, scrape: jest.fn() };
});
jest.mock('../src/price-recorder', () => ({
  PriceRecorder: jest.fn().mockImplementation(() => ({ record: jest.fn().mockResolvedValue({ reason: 'first' }) })),
}));
jest.mock('../src/scheduler', () => ({
  ScrapeScheduler: jest.fn().mockImplementation(() => ({ apply: jest.fn().mockResolvedValue(600) })),
}));

import { findDueProducts, updateLastScraped, updateProductCategory } from '@pricedrop/shared/db/products';
import { findMetrics } from '@pricedrop/shared/db/prices';
import { scrape } from '../src/scraper';
import { runBatch } from '../src/worker';

const mockDue = findDueProducts as jest.Mock;
const mockLastScraped = updateLastScraped as jest.Mock;
const mockUpdateCategory = updateProductCategory as jest.Mock;
const mockFindMetrics = findMetrics as jest.Mock;
const mockScrape = scrape as jest.MockedFunction<typeof scrape>;

function product(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'p1',
    url: 'https://www.amazon.in/x/dp/B09XS7JWHH',
    website: 'amazon',
    title: 'Sony WH-1000XM5 headphones',
    category: 'electronics',
    ...overrides,
  } as never;
}

beforeEach(() => {
  mockFindMetrics.mockResolvedValue(null);
  mockScrape.mockResolvedValue({ currentPrice: 4499, title: 't', thumbnailUrl: null, available: true });
});

describe('runBatch', () => {
  it('processes every due product and reports the count', async () => {
    mockDue.mockResolvedValue([product({ id: 'a' }), product({ id: 'b' })]);
    const res = await runBatch();
    expect(res.processed).toBe(2);
    expect(mockScrape).toHaveBeenCalledTimes(2);
    expect(mockLastScraped).toHaveBeenCalledWith('a', false);
    expect(mockLastScraped).toHaveBeenCalledWith('b', false);
  });

  it('skips products whose platform cannot be resolved', async () => {
    mockDue.mockResolvedValue([product({ id: 'x', website: 'unknownsite', url: 'https://mystery.example/p/1' })]);
    const res = await runBatch();
    expect(res.processed).toBe(1);
    expect(mockScrape).not.toHaveBeenCalled();
    expect(mockLastScraped).not.toHaveBeenCalled();
  });

  it('backfills category when the product is uncategorized', async () => {
    mockDue.mockResolvedValue([product({ id: 'c', category: null, title: 'gaming laptop rtx gpu' })]);
    await runBatch();
    expect(mockUpdateCategory).toHaveBeenCalledWith('c', 'electronics', expect.anything());
  });

  it('does not re-categorize an already-categorized product', async () => {
    mockDue.mockResolvedValue([product({ id: 'd', category: 'electronics' })]);
    await runBatch();
    expect(mockUpdateCategory).not.toHaveBeenCalled();
  });

  it('flags a failed scrape via updateLastScraped(id, true)', async () => {
    mockDue.mockResolvedValue([product({ id: 'e' })]);
    mockScrape.mockRejectedValueOnce(new Error('boom'));
    const res = await runBatch();
    expect(res.processed).toBe(1);
    expect(mockLastScraped).toHaveBeenCalledWith('e', true);
  });
});
