import { pool } from './client';
import { User } from '../constants/types';
import { CustomError } from '../constants/error';

export async function findUser(userId: number): Promise<User | null> {
  try {
    const { rows } = await pool.query<User>('SELECT * FROM users WHERE id = $1', [userId]);
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to get user', 'UserNotFound', { error });
  }
}

export async function insertUser(userId: number, username: string): Promise<void> {
  try {
    await pool.query('INSERT INTO users (id, username) VALUES ($1, $2)', [userId, username]);
  } catch (error) {
    throw new CustomError('Unable to add user', 'UserInsertionFailed', { error });
  }
}
