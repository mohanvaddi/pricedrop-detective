import { pool } from './client';
import { Price } from '../constants/types';
import { CustomError } from '../constants/error';

export async function findPricesByTracker(hash: string): Promise<Price[]> {
  try {
    const { rows } = await pool.query<Price>(
      'SELECT * FROM prices WHERE tracker = $1 ORDER BY created_at ASC',
      [hash],
    );
    return rows;
  } catch (error) {
    throw new CustomError('Unable to fetch prices', 'PricesError', { error });
  }
}

export async function findLatestPrice(hash: string): Promise<Price | null> {
  try {
    const { rows } = await pool.query<Price>(
      'SELECT * FROM prices WHERE tracker = $1 ORDER BY created_at DESC LIMIT 1',
      [hash],
    );
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to fetch latest price', 'PricesError', { error });
  }
}

export async function insertPrice(hash: string, price: number): Promise<void> {
  try {
    await pool.query('INSERT INTO prices (tracker, price) VALUES ($1, $2)', [hash, price]);
  } catch (error) {
    throw new CustomError('Unable to create price', 'PriceNotCreated', { error });
  }
}
