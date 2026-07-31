import { resetDb, makeProduct } from './db-helpers';
import { insertPrice, insertObservation, findLatestPrice, findPricesByProduct, findMetrics } from '../src/db/prices';

beforeEach(async () => {
  await resetDb();
});

describe('prices DB layer', () => {
  it('insertPrice seeds metrics on first insert', async () => {
    await makeProduct('p1');
    await insertPrice('p1', 1000, true);
    const m = await findMetrics('p1');
    expect(m?.initialPrice).toBe(1000);
    expect(m?.currentPrice).toBe(1000);
    expect(m?.allTimeLow).toBe(1000);
    expect(m?.available).toBe(true);
  });

  it('keeps initialPrice fixed while tracking currentPrice and all-time-low', async () => {
    await makeProduct('p1');
    await insertPrice('p1', 1000, true);
    await insertPrice('p1', 800, true);
    await insertPrice('p1', 1200, true);
    const m = await findMetrics('p1');
    expect(m?.initialPrice).toBe(1000); // unchanged
    expect(m?.currentPrice).toBe(1200); // latest
    expect(m?.allTimeLow).toBe(800); // LEAST over history
  });

  it('appends every observation to the price history', async () => {
    await makeProduct('p1');
    await insertPrice('p1', 1000, true);
    await insertPrice('p1', 900, true);
    const history = await findPricesByProduct('p1');
    expect(history.map((h) => h.price)).toEqual([1000, 900]); // ascending by created_at
  });

  it('findLatestPrice returns the most recent row', async () => {
    await makeProduct('p1');
    await insertPrice('p1', 1000, true);
    await insertPrice('p1', 777, false);
    const latest = await findLatestPrice('p1');
    expect(latest?.price).toBe(777);
    expect(latest?.available).toBe(false);
  });

  it('insertObservation updates availability + current price without touching initialPrice', async () => {
    await makeProduct('p1');
    await insertPrice('p1', 1000, true);
    await insertObservation('p1', 1000, false, false);
    const m = await findMetrics('p1');
    expect(m?.available).toBe(false);
    expect(m?.initialPrice).toBe(1000);
    expect(m?.allTimeLow).toBe(1000);
  });

  it('findMetrics returns null for an unknown product', async () => {
    expect(await findMetrics('nope')).toBeNull();
  });
});
