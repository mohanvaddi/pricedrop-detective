import { updateScrapeSchedule } from '@pricedrop/shared/db/products';
import type { ProductMetrics } from '@pricedrop/shared/db/schema';

/** Base scrape interval per category, in seconds. */
const CATEGORY_BASE_INTERVAL: Record<string, number> = {
  electronics: 600,
  grocery: 10800,
  fashion: 5400,
  books: 32400,
  beauty: 3600,
  home: 3600,
};

const DEFAULT_INTERVAL = 3600;
const MIN_INTERVAL = 300;
const MAX_INTERVAL = 43200;

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Computes an effective scrape interval for a product from its category base
 * interval and recent price-change history, then persists it so the worker's
 * due-selection picks products at the right cadence.
 *   - price changed within 24h  -> x0.5 (poll faster)
 *   - no change in 7 days        -> x2   (poll slower)
 *   - otherwise                  -> x1
 * Result is clamped to [300s, 43200s].
 */
export class ScrapeScheduler {
  computeInterval(category: string | null, metrics: ProductMetrics | null): number {
    const base = (category && CATEGORY_BASE_INTERVAL[category]) || DEFAULT_INTERVAL;

    let multiplier = 1;
    const lastChange = metrics?.lastPriceChangeAt ? new Date(metrics.lastPriceChangeAt).getTime() : null;
    if (lastChange != null) {
      const sinceChange = Date.now() - lastChange;
      if (sinceChange <= TWENTY_FOUR_HOURS_MS) {
        multiplier = 0.5;
      } else if (sinceChange >= SEVEN_DAYS_MS) {
        multiplier = 2;
      }
    }

    const interval = Math.round(base * multiplier);
    return Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, interval));
  }

  /** Map an interval to a coarse priority tier for future dispatch ordering. */
  priorityFor(interval: number): string {
    if (interval <= 900) return 'tier1';
    if (interval <= 5400) return 'tier2';
    return 'tier3';
  }

  /** Compute and persist the schedule for a product. Returns the interval used. */
  async apply(productId: string, category: string | null, metrics: ProductMetrics | null): Promise<number> {
    const interval = this.computeInterval(category, metrics);
    const priority = this.priorityFor(interval);
    await updateScrapeSchedule(productId, interval, priority);
    return interval;
  }
}
