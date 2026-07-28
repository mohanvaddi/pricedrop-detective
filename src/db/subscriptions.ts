import { eq, and, sql } from 'drizzle-orm';
import { db } from './client';
import { subscriptions } from './schema';
import { type Subscription } from './schema';
import { CustomError } from '../../constants/error';

export type { Subscription };

type SubscriberRow = {
  user_id: string;
  alert_price: number | null;
  notify_every_change: boolean;
  channel: 'telegram' | 'reddit' | 'web';
  channel_id: string | number;
};

export async function findSubscription(userId: string, productId: string): Promise<Subscription | null> {
  try {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.productId, productId)));
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to get subscription', 'SubscriptionNotFound', { error });
  }
}

export async function findSubscriptionsByUser(userId: string): Promise<Subscription[]> {
  try {
    return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  } catch (error) {
    throw new CustomError('Unable to fetch subscriptions', 'SubscriptionsError', { error });
  }
}

export async function findSubscribersForProduct(productId: string): Promise<SubscriberRow[]> {
  try {
    const result = await db.execute<SubscriberRow>(sql`
      SELECT
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
      WHERE s.product_id = ${productId}
    `);
    return result.rows;
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
    await db.insert(subscriptions).values({
      userId,
      productId,
      alertPrice: alertPrice ?? null,
      notifyEveryChange: notifyEveryChange ?? true,
    });
  } catch (error) {
    throw new CustomError('Unable to add subscription', 'SubscriptionInsertionFailed', { error });
  }
}

export async function deleteSubscription(userId: string, productId: string): Promise<void> {
  try {
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.productId, productId)));
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
    const updateValues =
      notifyEveryChange !== undefined
        ? { alertPrice, notifyEveryChange }
        : { alertPrice };
    await db
      .update(subscriptions)
      .set(updateValues)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.productId, productId)));
  } catch (error) {
    throw new CustomError('Unable to set alert price', 'SubscriptionUpdateError', { error });
  }
}

