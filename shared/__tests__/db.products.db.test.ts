import { resetDb, makeUser, makeProduct } from './db-helpers';
import * as ProductDB from '../src/db/products';
import * as SubscriptionDB from '../src/db/subscriptions';
import { insertPrice } from '../src/db/prices';
import { db } from '../src/db/client';
import { sql } from 'drizzle-orm';

beforeEach(async () => {
  await resetDb();
});

describe('products DB layer', () => {
  it('inserts and finds a product by hash', async () => {
    await ProductDB.insertProduct('p1', 'https://x/1', 'amazon', 'Widget', null, 'electronics');
    const found = await ProductDB.findProduct('p1');
    expect(found?.id).toBe('p1');
    expect(found?.category).toBe('electronics');
    expect(await ProductDB.findProduct('missing')).toBeNull();
  });

  it('findProductsByUser returns only subscribed products', async () => {
    const user = await makeUser();
    await makeProduct('p1');
    await makeProduct('p2');
    await SubscriptionDB.insertSubscription(user, 'p1');
    const rows = await ProductDB.findProductsByUser(user);
    expect(rows.map((r) => r.id)).toEqual(['p1']);
  });

  it('findAllActiveProducts computes subscriberCount and rankScore', async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    await makeProduct('p1');
    await SubscriptionDB.insertSubscription(u1, 'p1');
    await SubscriptionDB.insertSubscription(u2, 'p1');
    await insertPrice('p1', 999, true);

    const rows = await ProductDB.findAllActiveProducts();
    const p = rows.find((r) => r.id === 'p1')!;
    expect(p.subscriberCount).toBe(2);
    expect(p.rankScore).toBe(0 + 2 * 2); // viewCount 0 + subscribers*2
    expect(p.currentPrice).toBe(999);
  });

  it('findDueProducts returns never-scraped and past-interval products', async () => {
    const user = await makeUser();
    await makeProduct('due-new', { scrapeInterval: 300 });
    await makeProduct('not-due', { scrapeInterval: 3600 });
    await SubscriptionDB.insertSubscription(user, 'due-new');
    await SubscriptionDB.insertSubscription(user, 'not-due');
    // not-due was scraped just now
    await ProductDB.updateLastScraped('not-due', false);

    const due = await ProductDB.findDueProducts();
    const ids = due.map((d) => d.id);
    expect(ids).toContain('due-new'); // no metrics row → due
    expect(ids).not.toContain('not-due');
  });

  it('updateScrapeSchedule and updateProductCategory persist', async () => {
    await makeProduct('p1');
    await ProductDB.updateScrapeSchedule('p1', 1200, 'tier2');
    await ProductDB.updateProductCategory('p1', 'fashion', 'shoes');
    const p = await ProductDB.findProduct('p1');
    expect(p?.scrapeInterval).toBe(1200);
    expect(p?.priority).toBe('tier2');
    expect(p?.category).toBe('fashion');
    expect(p?.productType).toBe('shoes');
  });

  it('updateLastScraped increments failureCount on failure', async () => {
    await makeProduct('p1');
    await ProductDB.updateLastScraped('p1', true);
    await ProductDB.updateLastScraped('p1', true);
    const m = await db.execute<{ failure_count: number }>(sql`SELECT failure_count FROM product_metrics WHERE product_id = 'p1'`);
    expect(m.rows[0]!.failure_count).toBe(2);
  });
});
