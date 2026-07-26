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
    // Upsert metrics: initial_price set only on first insert; current + ATL always updated
    await pool.query(
      `INSERT INTO product_metrics (product_id, initial_price, current_price, all_time_low)
       VALUES ($1, $2, $2, $2)
       ON CONFLICT (product_id) DO UPDATE SET
         current_price = EXCLUDED.current_price,
         all_time_low  = LEAST(product_metrics.all_time_low, EXCLUDED.current_price),
         updated_at    = now()`,
      [productId, price],
    );
  } catch (error) {
    throw new CustomError('Unable to create price', 'PriceNotCreated', { error });
  }
}
