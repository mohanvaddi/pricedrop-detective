import { PriceRecorder } from '../src/price-recorder';
import type { ProductMetrics } from '@pricedrop/shared/db/schema';

jest.mock('@pricedrop/shared/db/prices', () => ({
  findMetrics: jest.fn(),
  insertObservation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@pricedrop/shared/db/notifications', () => ({
  enqueueNotification: jest.fn().mockResolvedValue(undefined),
}));

import { findMetrics, insertObservation } from '@pricedrop/shared/db/prices';
import { enqueueNotification } from '@pricedrop/shared/db/notifications';

const mockFindMetrics = findMetrics as jest.MockedFunction<typeof findMetrics>;
const mockInsertObservation = insertObservation as jest.MockedFunction<typeof insertObservation>;
const mockEnqueue = enqueueNotification as jest.MockedFunction<typeof enqueueNotification>;

const recorder = new PriceRecorder();

function metrics(over: Partial<ProductMetrics>): ProductMetrics {
  return {
    productId: 'p1',
    initialPrice: 100,
    currentPrice: 100,
    allTimeLow: 100,
    available: true,
    lastScrapedAt: null,
    lastObservationAt: new Date(),
    lastPriceChangeAt: null,
    failureCount: 0,
    updatedAt: new Date(),
    ...over,
  };
}

describe('PriceRecorder.record', () => {
  it('stores a first observation and enqueues nothing', async () => {
    mockFindMetrics.mockResolvedValue(null);
    const r = await recorder.record('p1', 999, true);
    expect(r).toMatchObject({ stored: true, reason: 'first', changeType: null });
    expect(mockInsertObservation).toHaveBeenCalledWith('p1', 999, true, true);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('treats null currentPrice as a first observation', async () => {
    mockFindMetrics.mockResolvedValue(metrics({ currentPrice: null }));
    const r = await recorder.record('p1', 500, true);
    expect(r.reason).toBe('first');
  });

  it('records a price drop and enqueues a "drop" notification', async () => {
    mockFindMetrics.mockResolvedValue(metrics({ currentPrice: 100, available: true }));
    const r = await recorder.record('p1', 80, true);
    expect(r).toMatchObject({ stored: true, priceChanged: true, changeType: 'drop', reason: 'price_change' });
    expect(mockInsertObservation).toHaveBeenCalledWith('p1', 80, true, true);
    expect(mockEnqueue).toHaveBeenCalledWith('p1', 'drop', 100, 80);
  });

  it('records a price increase and enqueues an "increase" notification', async () => {
    mockFindMetrics.mockResolvedValue(metrics({ currentPrice: 100 }));
    const r = await recorder.record('p1', 150, true);
    expect(r.changeType).toBe('increase');
    expect(mockEnqueue).toHaveBeenCalledWith('p1', 'increase', 100, 150);
  });

  it('enqueues "out_of_stock" when availability flips to false', async () => {
    mockFindMetrics.mockResolvedValue(metrics({ currentPrice: 100, available: true }));
    const r = await recorder.record('p1', 100, false);
    expect(r).toMatchObject({ availabilityFlipped: true, changeType: 'out_of_stock', reason: 'availability_flip' });
    expect(mockEnqueue).toHaveBeenCalledWith('p1', 'out_of_stock', 100, 100);
  });

  it('enqueues "back_in_stock" when availability flips to true', async () => {
    mockFindMetrics.mockResolvedValue(metrics({ currentPrice: 100, available: false }));
    const r = await recorder.record('p1', 100, true);
    expect(r.changeType).toBe('back_in_stock');
    expect(mockEnqueue).toHaveBeenCalledWith('p1', 'back_in_stock', 100, 100);
  });

  it('prefers the availability change type over price change when both move', async () => {
    mockFindMetrics.mockResolvedValue(metrics({ currentPrice: 100, available: true }));
    const r = await recorder.record('p1', 80, false);
    expect(r.priceChanged).toBe(true);
    expect(r.availabilityFlipped).toBe(true);
    expect(r.changeType).toBe('out_of_stock');
    expect(mockEnqueue).toHaveBeenCalledWith('p1', 'out_of_stock', 100, 80);
  });

  it('stores a silent stale-24h observation without a notification', async () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    mockFindMetrics.mockResolvedValue(metrics({ currentPrice: 100, available: true, lastObservationAt: old }));
    const r = await recorder.record('p1', 100, true);
    expect(r).toMatchObject({ stored: true, reason: 'stale_24h', changeType: null });
    expect(mockInsertObservation).toHaveBeenCalledWith('p1', 100, true, false);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('skips (no store, no notify) when nothing changed and not stale', async () => {
    const fresh = new Date(Date.now() - 60 * 1000);
    mockFindMetrics.mockResolvedValue(metrics({ currentPrice: 100, available: true, lastObservationAt: fresh }));
    const r = await recorder.record('p1', 100, true);
    expect(r).toMatchObject({ stored: false, reason: 'skipped', changeType: null });
    expect(mockInsertObservation).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
