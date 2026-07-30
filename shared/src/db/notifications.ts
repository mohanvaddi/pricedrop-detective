import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from './client';
import { notificationQueue } from './schema';
import { type NotificationQueue } from './schema';
import { CustomError } from '../error';

export type { NotificationQueue };

export type ChangeType = 'drop' | 'increase' | 'back_in_stock' | 'out_of_stock';

/** Enqueue a notification for the server poller to deliver. */
export async function enqueueNotification(
  productId: string,
  changeType: ChangeType,
  oldPrice: number | null,
  newPrice: number | null,
): Promise<void> {
  try {
    await db.insert(notificationQueue).values({ productId, changeType, oldPrice, newPrice });
  } catch (error) {
    throw new CustomError('Unable to enqueue notification', 'NotificationEnqueueFailed', { error });
  }
}

/** Fetch a batch of pending notifications (FIFO). */
export async function findPendingNotifications(limit = 50): Promise<NotificationQueue[]> {
  try {
    return await db
      .select()
      .from(notificationQueue)
      .where(eq(notificationQueue.status, 'pending'))
      .orderBy(asc(notificationQueue.createdAt))
      .limit(limit);
  } catch (error) {
    throw new CustomError('Unable to fetch notifications', 'NotificationFetchFailed', { error });
  }
}

/** Mark a notification as sent so it won't be re-delivered. */
export async function markNotificationSent(id: string): Promise<void> {
  try {
    await db
      .update(notificationQueue)
      .set({ status: 'sent', sentAt: sql`now()` })
      .where(and(eq(notificationQueue.id, id), eq(notificationQueue.status, 'pending')));
  } catch {
    // Non-fatal — worst case it is retried on the next poll.
  }
}
