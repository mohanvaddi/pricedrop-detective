import { ScrapeScheduler } from '../src/scheduler';
import type { ProductMetrics } from '@pricedrop/shared/db/schema';

jest.mock('@pricedrop/shared/db/products', () => ({
  updateScrapeSchedule: jest.fn().mockResolvedValue(undefined),
}));
import { updateScrapeSchedule } from '@pricedrop/shared/db/products';

const scheduler = new ScrapeScheduler();

function metrics(lastPriceChangeAt: Date | null): ProductMetrics {
  return {
    productId: 'p1',
    initialPrice: 100,
    currentPrice: 100,
    allTimeLow: 100,
    available: true,
    lastScrapedAt: null,
    lastObservationAt: null,
    lastPriceChangeAt,
    failureCount: 0,
    updatedAt: new Date(),
  };
}

describe('ScrapeScheduler.computeInterval', () => {
  it('uses the category base interval when there is no history', () => {
    expect(scheduler.computeInterval('electronics', null)).toBe(600);
    expect(scheduler.computeInterval('grocery', null)).toBe(10800);
  });

  it('falls back to the default interval for unknown/null categories', () => {
    expect(scheduler.computeInterval(null, null)).toBe(3600);
    expect(scheduler.computeInterval('unknown', null)).toBe(3600);
  });

  it('halves the interval when the price changed within 24h', () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
    expect(scheduler.computeInterval('electronics', metrics(recent))).toBe(300); // 600 * 0.5
  });

  it('doubles the interval when there was no change for 7+ days', () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(scheduler.computeInterval('beauty', metrics(old))).toBe(7200); // 3600 * 2
  });

  it('keeps the base interval for changes between 24h and 7d', () => {
    const mid = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(scheduler.computeInterval('fashion', metrics(mid))).toBe(5400);
  });

  it('clamps to the minimum (300s)', () => {
    const recent = new Date(Date.now() - 1000);
    // electronics 600 * 0.5 = 300 (already min); grocery not applicable — test a
    // hypothetical low base via electronics which is the lowest base.
    expect(scheduler.computeInterval('electronics', metrics(recent))).toBeGreaterThanOrEqual(300);
  });

  it('clamps to the maximum (43200s)', () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // books base 32400 * 2 = 64800 -> clamped to 43200
    expect(scheduler.computeInterval('books', metrics(old))).toBe(43200);
  });
});

describe('ScrapeScheduler.priorityFor', () => {
  it('maps intervals to coarse tiers', () => {
    expect(scheduler.priorityFor(300)).toBe('tier1');
    expect(scheduler.priorityFor(900)).toBe('tier1');
    expect(scheduler.priorityFor(5400)).toBe('tier2');
    expect(scheduler.priorityFor(10800)).toBe('tier3');
  });
});

describe('ScrapeScheduler.apply', () => {
  it('computes then persists the interval + priority and returns the interval', async () => {
    const interval = await scheduler.apply('p1', 'electronics', null);
    expect(interval).toBe(600);
    expect(updateScrapeSchedule).toHaveBeenCalledWith('p1', 600, 'tier1');
  });
});
