import { eq, asc, desc, sql } from 'drizzle-orm';
import { db } from './client';
import { prices, productMetrics } from './schema';
import { type Price, type ProductMetrics } from './schema';
import { CustomError } from '../error';

export type { Price };

export async function findMetrics(productId: string): Promise<ProductMetrics | null> {
  try {
    const rows = await db.select().from(productMetrics).where(eq(productMetrics.productId, productId)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to fetch product metrics', 'MetricsError', { error });
  }
}

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

export async function insertPrice(productId: string, price: number, available: boolean = true): Promise<void> {
  try {
    await db.insert(prices).values({ productId, price, available });
    // Upsert metrics: initial_price set only on first insert; current + ATL always updated
    await db
      .insert(productMetrics)
      .values({
        productId,
        initialPrice: price,
        currentPrice: price,
        allTimeLow: price,
        available,
        lastObservationAt: new Date(),
      })
      .onConflictDoUpdate({
        target: productMetrics.productId,
        set: {
          currentPrice: sql`EXCLUDED.current_price`,
          allTimeLow: sql`LEAST(${productMetrics.allTimeLow}, EXCLUDED.current_price)`,
          available: sql`EXCLUDED.available`,
          lastPriceChangeAt: sql`now()`,
          lastObservationAt: sql`now()`,
          failureCount: 0,
          updatedAt: sql`now()`,
        },
      });
  } catch (error) {
    throw new CustomError('Unable to create price', 'PriceNotCreated', { error });
  }
}

/**
 * Record an observation without treating it as a price change: bumps
 * lastObservationAt and availability but leaves lastPriceChangeAt untouched.
 * Used by the analytics recorder for the "24h elapsed" / availability-only cases.
 */
export async function insertObservation(productId: string, price: number, available: boolean, priceChanged: boolean): Promise<void> {
  try {
    await db.insert(prices).values({ productId, price, available });
    await db
      .insert(productMetrics)
      .values({
        productId,
        initialPrice: price,
        currentPrice: price,
        allTimeLow: price,
        available,
        lastObservationAt: new Date(),
        ...(priceChanged ? { lastPriceChangeAt: new Date() } : {}),
      })
      .onConflictDoUpdate({
        target: productMetrics.productId,
        set: {
          currentPrice: sql`EXCLUDED.current_price`,
          allTimeLow: sql`LEAST(${productMetrics.allTimeLow}, EXCLUDED.current_price)`,
          available: sql`EXCLUDED.available`,
          lastObservationAt: sql`now()`,
          failureCount: 0,
          updatedAt: sql`now()`,
          ...(priceChanged ? { lastPriceChangeAt: sql`now()` } : {}),
        },
      });
  } catch (error) {
    throw new CustomError('Unable to create observation', 'ObservationNotCreated', { error });
  }
}

