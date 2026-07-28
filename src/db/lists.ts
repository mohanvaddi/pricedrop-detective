import { eq, sql } from 'drizzle-orm';
import { db } from './client';
import { lists, listItems, type List, type ListItem } from './schema';

export type { List, ListItem };

export async function findListsByUser(userId: string): Promise<List[]> {
  return db.select().from(lists).where(eq(lists.userId, userId));
}

export async function findListById(listId: string): Promise<List | null> {
  const rows = await db.select().from(lists).where(eq(lists.id, listId));
  return rows[0] ?? null;
}

export async function countListsByUser(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lists)
    .where(eq(lists.userId, userId));
  return result[0]?.count ?? 0;
}

export async function insertList(userId: string, name: string): Promise<List> {
  const rows = await db.insert(lists).values({ userId, name }).returning();
  return rows[0]!;
}

export async function updateListName(listId: string, name: string): Promise<void> {
  await db.update(lists).set({ name }).where(eq(lists.id, listId));
}

export async function updateList(listId: string, data: { name?: string; isPublic?: boolean }): Promise<void> {
  await db.update(lists).set(data).where(eq(lists.id, listId));
}


export async function deleteList(listId: string): Promise<void> {
  await db.delete(lists).where(eq(lists.id, listId));
}

export async function assignSubscriptionToList(subscriptionId: string, listId: string): Promise<void> {
  // Upsert: if subscription already has a list_items entry, update it; otherwise insert
  const existing = await db
    .select()
    .from(listItems)
    .where(eq(listItems.subscriptionId, subscriptionId));

  if (existing[0]) {
    await db
      .update(listItems)
      .set({ listId })
      .where(eq(listItems.subscriptionId, subscriptionId));
  } else {
    await db.insert(listItems).values({ listId, subscriptionId });
  }
}

export async function removeSubscriptionFromList(subscriptionId: string): Promise<void> {
  await db.delete(listItems).where(eq(listItems.subscriptionId, subscriptionId));
}

export async function findListItemBySubscription(subscriptionId: string): Promise<ListItem | null> {
  const rows = await db
    .select()
    .from(listItems)
    .where(eq(listItems.subscriptionId, subscriptionId));
  return rows[0] ?? null;
}

export async function findSubscriptionIdsByList(listId: string): Promise<string[]> {
  const rows = await db
    .select({ subscriptionId: listItems.subscriptionId })
    .from(listItems)
    .where(eq(listItems.listId, listId));
  return rows.map((r) => r.subscriptionId);
}

export async function findUnlistedSubscriptionIds(userId: string): Promise<string[]> {
  // Subscriptions that have no entry in list_items
  const result = await db.execute<{ id: string }>(sql`
    SELECT s.id
    FROM subscriptions s
    WHERE s.user_id = ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM list_items li WHERE li.subscription_id = s.id
      )
  `);
  return result.rows.map((r) => r.id);
}

export async function getListItemCounts(userId: string): Promise<Record<string, number>> {
  const result = await db.execute<{ list_id: string; count: number }>(sql`
    SELECT li.list_id, count(*)::int as count
    FROM list_items li
    JOIN subscriptions s ON s.id = li.subscription_id
    WHERE s.user_id = ${userId}
    GROUP BY li.list_id
  `);
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.list_id] = row.count;
  }
  return counts;
}

export interface PublicListProduct {
  id: string;
  url: string;
  website: string;
  title: string | null;
  thumbnailUrl: string | null;
  currentPrice: number | null;
  initialPrice: number | null;
  allTimeLow: number | null;
}

export interface PublicListData {
  id: string;
  name: string;
  ownerName: string | null;
  products: PublicListProduct[];
}

export async function findPublicListWithProducts(listId: string): Promise<PublicListData | null> {
  // First check the list exists and is public
  const listRows = await db.select().from(lists).where(eq(lists.id, listId));
  const list = listRows[0];
  if (!list || !list.isPublic) return null;

  // Get owner display name
  type OwnerRow = { display_name: string | null };
  const ownerResult = await db.execute<OwnerRow>(sql`
    SELECT wu.display_name FROM web_users wu WHERE wu.user_id = ${list.userId}
  `);
  const ownerName = ownerResult.rows[0]?.display_name ?? null;

  // Get products in this list via list_items -> subscriptions -> products + product_metrics
  type ProductRow = {
    id: string;
    url: string;
    website: string;
    title: string | null;
    thumbnail_url: string | null;
    current_price: number | null;
    initial_price: number | null;
    all_time_low: number | null;
  };
  const productsResult = await db.execute<ProductRow>(sql`
    SELECT DISTINCT
      p.id,
      p.url,
      p.website,
      p.title,
      p.thumbnail_url,
      pm.current_price,
      pm.initial_price,
      pm.all_time_low
    FROM list_items li
    JOIN subscriptions s ON s.id = li.subscription_id
    JOIN products p ON p.id = s.product_id
    LEFT JOIN product_metrics pm ON pm.product_id = p.id
    WHERE li.list_id = ${listId}
  `);

  return {
    id: list.id,
    name: list.name,
    ownerName,
    products: productsResult.rows.map((r) => ({
      id: r.id,
      url: r.url,
      website: r.website,
      title: r.title,
      thumbnailUrl: r.thumbnail_url,
      currentPrice: r.current_price,
      initialPrice: r.initial_price,
      allTimeLow: r.all_time_low,
    })),
  };
}
