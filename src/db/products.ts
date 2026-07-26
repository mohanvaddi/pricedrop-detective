import { pool } from './client';
import { Product, EnrichedProduct } from '../../constants/types';
import { CustomError } from '../../constants/error';
import { Platform } from '../scraper';

export async function findProduct(hash: string): Promise<Product | null> {
  try {
    const { rows } = await pool.query<Product>('SELECT * FROM products WHERE id = $1', [hash]);
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to get product', 'ProductNotFound', { error });
  }
}

export async function incrementViewCount(hash: string): Promise<void> {
  try {
    await pool.query('UPDATE products SET view_count = view_count + 1 WHERE id = $1', [hash]);
  } catch {
    // Non-fatal — ignore errors on view count increment
  }
}

export async function findAllActiveProducts(): Promise<EnrichedProduct[]> {
  try {
    const { rows } = await pool.query<EnrichedProduct>(`
      SELECT
        p.id,
        p.url,
        p.website,
        p.title,
        p.thumbnail_url,
        p.view_count,
        p.created_at,
        COUNT(DISTINCT s.user_id)::int AS subscriber_count,
        (p.view_count + COUNT(DISTINCT s.user_id)::int * 2) AS rank_score,
        pm.initial_price,
        pm.current_price,
        pm.all_time_low,
        wu.display_name AS added_by
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
    return rows;
  } catch (error) {
    throw new CustomError('Unable to fetch active products', 'ProductsError', { error });
  }
}

export async function findProductsByUser(userId: string): Promise<Product[]> {
  try {
    const { rows } = await pool.query<Product>(
      'SELECT p.* FROM products p JOIN subscriptions s ON s.product_id = p.id WHERE s.user_id = $1',
      [userId],
    );
    return rows;
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
    await pool.query(
      'INSERT INTO products (id, url, website, title, thumbnail_url) VALUES ($1, $2, $3, $4, $5)',
      [hash, url, website, title, thumbnailUrl],
    );
  } catch (error) {
    throw new CustomError('Unable to add product', 'ProductInsertionFailed', { error });
  }
}

export async function updateProductTitle(hash: string, title: string): Promise<void> {
  try {
    await pool.query('UPDATE products SET title = $1 WHERE id = $2', [title, hash]);
  } catch (error) {
    throw new CustomError('Unable to update product title', 'ProductUpdateError', { error });
  }
}
