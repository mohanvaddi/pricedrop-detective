import { pool } from './client';
import { Subscription } from '../../constants/types';
import { CustomError } from '../../constants/error';

export async function findSubscription(userId: string, productId: string): Promise<Subscription | null> {
  try {
    const { rows } = await pool.query<Subscription>(
      'SELECT * FROM subscriptions WHERE user_id = $1 AND product_id = $2',
      [userId, productId],
    );
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to get subscription', 'SubscriptionNotFound', { error });
  }
}

export async function findSubscriptionsByUser(userId: string): Promise<Subscription[]> {
  try {
    const { rows } = await pool.query<Subscription>('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
    return rows;
  } catch (error) {
    throw new CustomError('Unable to fetch subscriptions', 'SubscriptionsError', { error });
  }
}

export async function findSubscribersForProduct(
  productId: string,
): Promise<{ user_id: string; alert_price: number | null; notify_every_change: boolean; channel: 'telegram' | 'reddit' | 'web'; channel_id: string | number }[]> {
  try {
    const { rows } = await pool.query<{ user_id: string; alert_price: number | null; notify_every_change: boolean; channel: 'telegram' | 'reddit' | 'web'; channel_id: string | number }>(
      `SELECT
         s.user_id,
         s.alert_price,
         s.notify_every_change,
         CASE
           WHEN tu.telegram_id IS NOT NULL THEN 'telegram'
           WHEN ru.reddit_username IS NOT NULL THEN 'reddit'
           ELSE 'web'
         END AS channel,
         COALESCE(tu.telegram_id::text, ru.reddit_username, wu.email) AS channel_id
       FROM subscriptions s
       LEFT JOIN telegram_users tu ON tu.user_id = s.user_id
       LEFT JOIN reddit_users   ru ON ru.user_id = s.user_id
       LEFT JOIN web_users      wu ON wu.user_id = s.user_id
       WHERE s.product_id = $1`,
      [productId],
    );
    return rows;
  } catch (error) {
    throw new CustomError('Unable to fetch subscribers', 'SubscribersError', { error });
  }
}

export async function insertSubscription(
  userId: string,
  productId: string,
  alertPrice?: number,
  notifyEveryChange?: boolean,
): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO subscriptions (user_id, product_id, alert_price, notify_every_change) VALUES ($1, $2, $3, $4)',
      [userId, productId, alertPrice ?? null, notifyEveryChange ?? true],
    );
  } catch (error) {
    throw new CustomError('Unable to add subscription', 'SubscriptionInsertionFailed', { error });
  }
}

export async function deleteSubscription(userId: string, productId: string): Promise<void> {
  try {
    await pool.query('DELETE FROM subscriptions WHERE user_id = $1 AND product_id = $2', [userId, productId]);
  } catch (error) {
    throw new CustomError('Unable to delete subscription', 'SubscriptionNotDeleted', { error });
  }
}

export async function setAlertPrice(
  userId: string,
  productId: string,
  alertPrice: number | null,
  notifyEveryChange?: boolean,
): Promise<void> {
  try {
    if (notifyEveryChange !== undefined) {
      await pool.query(
        'UPDATE subscriptions SET alert_price = $1, notify_every_change = $2 WHERE user_id = $3 AND product_id = $4',
        [alertPrice, notifyEveryChange, userId, productId],
      );
    } else {
      await pool.query(
        'UPDATE subscriptions SET alert_price = $1 WHERE user_id = $2 AND product_id = $3',
        [alertPrice, userId, productId],
      );
    }
  } catch (error) {
    throw new CustomError('Unable to set alert price', 'SubscriptionUpdateError', { error });
  }
}
