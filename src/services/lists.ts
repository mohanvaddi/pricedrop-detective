import * as ListDB from '../db/lists';
import * as SubscriptionDB from '../db/subscriptions';
import * as ProductDB from '../db/products';
import { CustomError } from '../../constants/error';
import { MAX_CUSTOM_LISTS } from '../constants/limits';
import { type List } from '../db/schema';
import { type Product, type Subscription } from '../../constants/types';

export interface ListWithCount extends List {
  itemCount: number;
}

export async function getListsByUser(userId: string): Promise<ListWithCount[]> {
  const [userLists, counts] = await Promise.all([
    ListDB.findListsByUser(userId),
    ListDB.getListItemCounts(userId),
  ]);
  return userLists.map((list) => ({
    ...list,
    itemCount: counts[list.id] ?? 0,
  }));
}

export async function createList(userId: string, name: string): Promise<List> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new CustomError('List name cannot be empty', 'InvalidListName');
  }

  const count = await ListDB.countListsByUser(userId);
  if (count >= MAX_CUSTOM_LISTS) {
    throw new CustomError(
      `You can create a maximum of ${MAX_CUSTOM_LISTS} lists.`,
      'ListLimitReached',
    );
  }

  try {
    return await ListDB.insertList(userId, trimmed);
  } catch (error: any) {
    if (error?.code === '23505' || error?.cause?.code === '23505') {
      throw new CustomError('A list with this name already exists.', 'ListNameTaken');
    }
    throw error;
  }
}

export async function renameList(userId: string, listId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new CustomError('List name cannot be empty', 'InvalidListName');
  }

  const list = await ListDB.findListById(listId);
  if (!list || list.userId !== userId) {
    throw new CustomError('List not found.', 'ListNotFound');
  }

  try {
    await ListDB.updateListName(listId, trimmed);
  } catch (error: any) {
    if (error?.code === '23505' || error?.cause?.code === '23505') {
      throw new CustomError('A list with this name already exists.', 'ListNameTaken');
    }
    throw error;
  }
}

export async function updateListSettings(
  userId: string,
  listId: string,
  data: { name?: string; isPublic?: boolean },
): Promise<void> {
  const list = await ListDB.findListById(listId);
  if (!list || list.userId !== userId) {
    throw new CustomError('List not found.', 'ListNotFound');
  }

  const update: { name?: string; isPublic?: boolean } = {};
  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (!trimmed) throw new CustomError('List name cannot be empty', 'InvalidListName');
    update.name = trimmed;
  }
  if (data.isPublic !== undefined) {
    update.isPublic = data.isPublic;
  }

  if (Object.keys(update).length === 0) return;

  try {
    await ListDB.updateList(listId, update);
  } catch (error: any) {
    if (error?.code === '23505' || error?.cause?.code === '23505') {
      throw new CustomError('A list with this name already exists.', 'ListNameTaken');
    }
    throw error;
  }
}

export async function deleteList(userId: string, listId: string): Promise<void> {
  const list = await ListDB.findListById(listId);
  if (!list || list.userId !== userId) {
    throw new CustomError('List not found.', 'ListNotFound');
  }
  await ListDB.deleteList(listId);
}

export async function assignToList(subscriptionId: string, listId: string | null): Promise<void> {
  if (listId === null) {
    await ListDB.removeSubscriptionFromList(subscriptionId);
  } else {
    await ListDB.assignSubscriptionToList(subscriptionId, listId);
  }
}

export async function getTrackersByList(
  userId: string,
  listFilter: 'all' | 'unlisted' | string,
): Promise<{ product: Product; subscription: Subscription }[]> {
  const allSubs = await SubscriptionDB.findSubscriptionsByUser(userId);
  const allProducts = await ProductDB.findProductsByUser(userId);
  const productMap = new Map(allProducts.map((p) => [p.id, p]));

  let filteredSubs: Subscription[];

  if (listFilter === 'all') {
    filteredSubs = allSubs;
  } else if (listFilter === 'unlisted') {
    const unlistedIds = new Set(await ListDB.findUnlistedSubscriptionIds(userId));
    filteredSubs = allSubs.filter((s) => unlistedIds.has(s.id));
  } else {
    const listedIds = new Set(await ListDB.findSubscriptionIdsByList(listFilter));
    filteredSubs = allSubs.filter((s) => listedIds.has(s.id));
  }

  return filteredSubs
    .map((sub) => ({ product: productMap.get(sub.productId)!, subscription: sub }))
    .filter((entry) => entry.product != null);
}

export async function getPublicList(listId: string): Promise<ListDB.PublicListData | null> {
  return ListDB.findPublicListWithProducts(listId);
}
