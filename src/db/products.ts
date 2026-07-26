import { pool } from './client';
import { Product } from '../../constants/types';
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

export async function findAllActiveProducts(): Promise<Product[]> {
  try {
    const { rows } = await pool.query<Product>(
      'SELECT p.* FROM products p WHERE EXISTS (SELECT 1 FROM subscriptions s WHERE s.product_id = p.id)',
    );
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

export async function insertProduct(hash: string, url: string, website: Platform, title: string | null): Promise<void> {
  try {
    await pool.query('INSERT INTO products (id, url, website, title) VALUES ($1, $2, $3, $4)', [
      hash,
      url,
      website,
      title,
    ]);
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
