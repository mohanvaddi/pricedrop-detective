import { eq, asc, desc, sql } from 'drizzle-orm';
import { db } from './client';
import { prices, productMetrics } from './schema';
import { type Price } from './schema';
import { CustomError } from '../../constants/error';

export type { Price };

export async function findPricesByProduct(productId: string): Promise<Price[]> {
  try {
    return await db.select().from(prices).where(eq(prices.productId, productId)).orderBy(asc(prices.createdAt));
  } catch (error) {
    throw new CustomError('Unable to fetch prices', 'PricesError', { error });
  }
}

export async function findLatestPrice(productId: string): Promise<Price | null> {
  try {
    const rows = await db
      .select()
      .from(prices)
      .where(eq(prices.productId, productId))
      .orderBy(desc(prices.createdAt))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to fetch latest price', 'PricesError', { error });
  }
}

export async function insertPrice(productId: string, price: number): Promise<void> {
  try {
    await db.insert(prices).values({ productId, price });
    // Upsert metrics: initial_price set only on first insert; current + ATL always updated
    await db
      .insert(productMetrics)
      .values({ productId, initialPrice: price, currentPrice: price, allTimeLow: price })
      .onConflictDoUpdate({
        target: productMetrics.productId,
        set: {
          currentPrice: sql`EXCLUDED.current_price`,
          allTimeLow: sql`LEAST(${productMetrics.allTimeLow}, EXCLUDED.current_price)`,
          lastPriceChangeAt: sql`now()`,
          failureCount: 0,
          updatedAt: sql`now()`,
        },
      });
  } catch (error) {
    throw new CustomError('Unable to create price', 'PriceNotCreated', { error });
  }
}

