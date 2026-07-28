import { eq, sql } from 'drizzle-orm';
import { db } from './client';
import { products, subscriptions, productMetrics } from './schema';
import { type Product, type EnrichedProduct } from './schema';
import { CustomError } from '../../constants/error';
import { Platform } from '../scraper';

export type { Product, EnrichedProduct };

export async function findProduct(hash: string): Promise<Product | null> {
  try {
    const rows = await db.select().from(products).where(eq(products.id, hash));
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to get product', 'ProductNotFound', { error });
  }
}

export async function incrementViewCount(hash: string): Promise<void> {
  try {
    await db
      .update(products)
      .set({ viewCount: sql`${products.viewCount} + 1` })
      .where(eq(products.id, hash));
  } catch {
    // Non-fatal
  }
}

export async function findAllActiveProducts(): Promise<EnrichedProduct[]> {
  try {
    type Row = Record<string, unknown>;
    const rows = await db.execute<Row>(sql`
      SELECT
        p.id,
        p.url,
        p.website,
        p.title,
        p.thumbnail_url        AS "thumbnailUrl",
        p.view_count           AS "viewCount",
        p.scrape_interval      AS "scrapeInterval",
        p.priority,
        p.created_at           AS "createdAt",
        COUNT(DISTINCT s.user_id)::int                          AS "subscriberCount",
        (p.view_count + COUNT(DISTINCT s.user_id)::int * 2)    AS "rankScore",
        pm.initial_price       AS "initialPrice",
        pm.current_price       AS "currentPrice",
        pm.all_time_low        AS "allTimeLow",
        wu.display_name        AS "addedBy"
      FROM products p
      JOIN subscriptions s ON s.product_id = p.id
      LEFT JOIN product_metrics pm ON pm.product_id = p.id
      LEFT JOIN (
        SELECT DISTINCT ON (product_id) product_id, user_id
        FROM subscriptions
        ORDER BY product_id, created_at ASC
      ) first_sub ON first_sub.product_id = p.id
      LEFT JOIN web_users wu ON wu.user_id = first_sub.user_id
      GROUP BY p.id, pm.initial_price, pm.current_price, pm.all_time_low, wu.display_name
    `);
    return rows.rows as unknown as EnrichedProduct[];
  } catch (error) {
    throw new CustomError('Unable to fetch active products', 'ProductsError', { error });
  }
}

export async function findProductsByUser(userId: string): Promise<Product[]> {
  try {
    const rows = await db
      .select({ product: products })
      .from(products)
      .innerJoin(subscriptions, eq(subscriptions.productId, products.id))
      .where(eq(subscriptions.userId, userId));
    return rows.map((r) => r.product);
  } catch (error) {
    throw new CustomError('Unable to fetch products', 'ProductsError', { error });
  }
}

export async function insertProduct(
  hash: string,
  url: string,
  website: Platform,
  title: string | null,
  thumbnailUrl: string | null = null,
): Promise<void> {
  try {
    await db.insert(products).values({ id: hash, url, website, title, thumbnailUrl });
  } catch (error) {
    throw new CustomError('Unable to add product', 'ProductInsertionFailed', { error });
  }
}

export async function updateLastScraped(productId: string, failed: boolean): Promise<void> {
  try {
    if (failed) {
      await db
        .insert(productMetrics)
        .values({ productId, failureCount: 1, lastScrapedAt: new Date() })
        .onConflictDoUpdate({
          target: productMetrics.productId,
          set: {
            failureCount: sql`${productMetrics.failureCount} + 1`,
            lastScrapedAt: sql`now()`,
            updatedAt: sql`now()`,
          },
        });
    } else {
      await db
        .insert(productMetrics)
        .values({ productId, failureCount: 0, lastScrapedAt: new Date() })
        .onConflictDoUpdate({
          target: productMetrics.productId,
          set: {
            lastScrapedAt: sql`now()`,
            updatedAt: sql`now()`,
          },
        });
    }
  } catch {
    // Non-fatal
  }
}

export async function updateProductTitle(hash: string, title: string): Promise<void> {
  try {
    await db.update(products).set({ title }).where(eq(products.id, hash));
  } catch (error) {
    throw new CustomError('Unable to update product title', 'ProductUpdateError', { error });
  }
}

