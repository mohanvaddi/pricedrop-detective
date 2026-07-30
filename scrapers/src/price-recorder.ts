import { findMetrics, insertObservation } from '@pricedrop/shared/db/prices';
import { enqueueNotification, type ChangeType } from '@pricedrop/shared/db/notifications';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface RecordResult {
  stored: boolean;
  priceChanged: boolean;
  availabilityFlipped: boolean;
  changeType: ChangeType | null;
  reason: 'first' | 'price_change' | 'availability_flip' | 'stale_24h' | 'skipped';
}

/**
 * Decides whether a fresh scrape observation should be persisted and what
 * notification (if any) it warrants. Stores an observation when:
 *   - it is the first observation for the product, OR
 *   - the price changed, OR
 *   - availability flipped (in <-> out of stock), OR
 *   - >= 24h elapsed since the last stored observation.
 * Only genuine price changes / availability flips enqueue a notification; the
 * 24h "keep-alive" observation is silent (analytics only).
 */
export class PriceRecorder {
  async record(productId: string, newPrice: number, available: boolean): Promise<RecordResult> {
    const metrics = await findMetrics(productId);

    // First-ever observation for this product.
    if (!metrics || metrics.currentPrice == null) {
      await insertObservation(productId, newPrice, available, true);
      return { stored: true, priceChanged: false, availabilityFlipped: false, changeType: null, reason: 'first' };
    }

    const oldPrice = metrics.currentPrice;
    const priceChanged = oldPrice !== newPrice;
    const availabilityFlipped = metrics.available != null && metrics.available !== available;
    const stale = metrics.lastObservationAt != null && Date.now() - new Date(metrics.lastObservationAt).getTime() >= TWENTY_FOUR_HOURS_MS;

    if (!priceChanged && !availabilityFlipped && !stale) {
      return { stored: false, priceChanged: false, availabilityFlipped: false, changeType: null, reason: 'skipped' };
    }

    await insertObservation(productId, newPrice, available, priceChanged);

    let changeType: ChangeType | null = null;
    if (availabilityFlipped) {
      changeType = available ? 'back_in_stock' : 'out_of_stock';
    } else if (priceChanged) {
      changeType = newPrice < oldPrice ? 'drop' : 'increase';
    }

    if (changeType) {
      await enqueueNotification(productId, changeType, oldPrice, newPrice);
    }

    const reason = availabilityFlipped ? 'availability_flip' : priceChanged ? 'price_change' : 'stale_24h';
    return { stored: true, priceChanged, availabilityFlipped, changeType, reason };
  }
}
