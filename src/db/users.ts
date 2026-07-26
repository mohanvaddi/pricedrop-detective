import { pool } from './client';
import { User } from '../../constants/types';
import { CustomError } from '../../constants/error';

/** Find the abstract users row by its UUID. */
export async function findUser(userId: string): Promise<User | null> {
  try {
    const { rows } = await pool.query<User>('SELECT * FROM users WHERE id = $1', [userId]);
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to get user', 'UserNotFound', { error });
  }
}

/**
 * Find or create an abstract user via Telegram ID.
 * Returns the abstract user UUID.
 */
export async function findOrCreateTelegramUser(telegramId: number, username: string): Promise<string> {
  try {
    const existing = await pool.query<{ user_id: string }>(
      'SELECT user_id FROM telegram_users WHERE telegram_id = $1',
      [telegramId],
    );
    if (existing.rows[0]) return existing.rows[0].user_id;

    // Create abstract identity row, then link Telegram
    const { rows } = await pool.query<{ id: string }>('INSERT INTO users DEFAULT VALUES RETURNING id');
    const userId = rows[0]!.id;
    await pool.query('INSERT INTO telegram_users (user_id, telegram_id, username) VALUES ($1, $2, $3)', [
      userId,
      telegramId,
      username,
    ]);
    return userId;
  } catch (error) {
    throw new CustomError('Unable to create Telegram user', 'UserInsertionFailed', { error });
  }
}

/**
 * Find or create an abstract user via Reddit username.
 * Returns the abstract user UUID.
 */
export async function findOrCreateRedditUser(redditUsername: string): Promise<string> {
  try {
    const existing = await pool.query<{ user_id: string }>(
      'SELECT user_id FROM reddit_users WHERE reddit_username = $1',
      [redditUsername],
    );
    if (existing.rows[0]) return existing.rows[0].user_id;

    const { rows } = await pool.query<{ id: string }>('INSERT INTO users DEFAULT VALUES RETURNING id');
    const userId = rows[0]!.id;
    await pool.query('INSERT INTO reddit_users (user_id, reddit_username) VALUES ($1, $2)', [userId, redditUsername]);
    return userId;
  } catch (error) {
    throw new CustomError('Unable to create Reddit user', 'UserInsertionFailed', { error });
  }
}

/** Create a web user (email + password + optional display name). Returns the abstract user UUID. */
export async function createWebUser(email: string, passwordHash: string, displayName?: string): Promise<string> {
  try {
    const { rows } = await pool.query<{ id: string }>('INSERT INTO users DEFAULT VALUES RETURNING id');
    const userId = rows[0]!.id;
    await pool.query(
      'INSERT INTO web_users (user_id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
      [userId, email, passwordHash, displayName?.trim() ?? null],
    );
    return userId;
  } catch (error) {
    throw new CustomError('Unable to create web user', 'UserInsertionFailed', { error });
  }
}

/** Find a web user by email. Returns { userId, passwordHash } or null. */
export async function findWebUserByEmail(email: string): Promise<{ userId: string; passwordHash: string } | null> {
  try {
    const { rows } = await pool.query<{ user_id: string; password_hash: string }>(
      'SELECT user_id, password_hash FROM web_users WHERE email = $1',
      [email],
    );
    if (!rows[0]) return null;
    return { userId: rows[0].user_id, passwordHash: rows[0].password_hash };
  } catch (error) {
    throw new CustomError('Unable to find web user', 'UserNotFound', { error });
  }
}

