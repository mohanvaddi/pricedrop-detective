import { pool } from './client';
import { Price } from '../../constants/types';
import { CustomError } from '../../constants/error';

export async function findPricesByProduct(productId: string): Promise<Price[]> {
  try {
    const { rows } = await pool.query<Price>(
      'SELECT * FROM prices WHERE product_id = $1 ORDER BY created_at ASC',
      [productId],
    );
    return rows;
  } catch (error) {
    throw new CustomError('Unable to fetch prices', 'PricesError', { error });
  }
}

export async function findLatestPrice(productId: string): Promise<Price | null> {
  try {
    const { rows } = await pool.query<Price>(
      'SELECT * FROM prices WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
      [productId],
    );
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to fetch latest price', 'PricesError', { error });
  }
}

export async function insertPrice(productId: string, price: number): Promise<void> {
  try {
    await pool.query('INSERT INTO prices (product_id, price) VALUES ($1, $2)', [productId, price]);
  } catch (error) {
    throw new CustomError('Unable to create price', 'PriceNotCreated', { error });
  }
}
