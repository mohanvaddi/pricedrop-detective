jest.mock('@pricedrop/shared/db/lists', () => ({
  findListsByUser: jest.fn(),
  getListItemCounts: jest.fn(),
  countListsByUser: jest.fn(),
  insertList: jest.fn(),
  findListById: jest.fn(),
  updateListName: jest.fn(),
  updateList: jest.fn(),
  deleteList: jest.fn(),
  removeSubscriptionFromList: jest.fn(),
  assignSubscriptionToList: jest.fn(),
  findUnlistedSubscriptionIds: jest.fn(),
  findSubscriptionIdsByList: jest.fn(),
}));
jest.mock('@pricedrop/shared/db/subscriptions', () => ({ findSubscriptionsByUser: jest.fn() }));
jest.mock('@pricedrop/shared/db/products', () => ({ findProductsByUser: jest.fn() }));

import * as ListDB from '@pricedrop/shared/db/lists';
import * as SubscriptionDB from '@pricedrop/shared/db/subscriptions';
import * as ProductDB from '@pricedrop/shared/db/products';
import { createList, renameList, updateListSettings, deleteList, assignToList, getTrackersByList } from '../src/services/lists';

describe('createList', () => {
  it('rejects an empty name', async () => {
    await expect(createList('u1', '   ')).rejects.toMatchObject({ name: 'InvalidListName' });
  });

  it('rejects when the user is at the list cap', async () => {
    (ListDB.countListsByUser as jest.Mock).mockResolvedValue(3);
    await expect(createList('u1', 'Wishlist')).rejects.toMatchObject({ name: 'ListLimitReached' });
  });

  it('creates a list under the cap', async () => {
    (ListDB.countListsByUser as jest.Mock).mockResolvedValue(1);
    (ListDB.insertList as jest.Mock).mockResolvedValue({ id: 'l1', name: 'Wishlist' });
    const res = await createList('u1', '  Wishlist  ');
    expect(ListDB.insertList).toHaveBeenCalledWith('u1', 'Wishlist');
    expect(res).toEqual({ id: 'l1', name: 'Wishlist' });
  });

  it('maps a unique-violation to ListNameTaken', async () => {
    (ListDB.countListsByUser as jest.Mock).mockResolvedValue(0);
    (ListDB.insertList as jest.Mock).mockRejectedValue({ code: '23505' });
    await expect(createList('u1', 'Dup')).rejects.toMatchObject({ name: 'ListNameTaken' });
  });
});

describe('renameList', () => {
  it('throws ListNotFound when the list is not owned by the user', async () => {
    (ListDB.findListById as jest.Mock).mockResolvedValue({ id: 'l1', userId: 'other' });
    await expect(renameList('u1', 'l1', 'New')).rejects.toMatchObject({ name: 'ListNotFound' });
  });

  it('renames an owned list', async () => {
    (ListDB.findListById as jest.Mock).mockResolvedValue({ id: 'l1', userId: 'u1' });
    await renameList('u1', 'l1', '  New  ');
    expect(ListDB.updateListName).toHaveBeenCalledWith('l1', 'New');
  });
});

describe('updateListSettings', () => {
  it('throws ListNotFound for a non-owner', async () => {
    (ListDB.findListById as jest.Mock).mockResolvedValue({ id: 'l1', userId: 'other' });
    await expect(updateListSettings('u1', 'l1', { isPublic: true })).rejects.toMatchObject({ name: 'ListNotFound' });
  });

  it('is a no-op when there is nothing to update', async () => {
    (ListDB.findListById as jest.Mock).mockResolvedValue({ id: 'l1', userId: 'u1' });
    await updateListSettings('u1', 'l1', {});
    expect(ListDB.updateList).not.toHaveBeenCalled();
  });

  it('updates name + visibility for an owned list', async () => {
    (ListDB.findListById as jest.Mock).mockResolvedValue({ id: 'l1', userId: 'u1' });
    await updateListSettings('u1', 'l1', { name: ' Public ', isPublic: true });
    expect(ListDB.updateList).toHaveBeenCalledWith('l1', { name: 'Public', isPublic: true });
  });
});

describe('deleteList', () => {
  it('throws ListNotFound for a non-owner', async () => {
    (ListDB.findListById as jest.Mock).mockResolvedValue({ id: 'l1', userId: 'other' });
    await expect(deleteList('u1', 'l1')).rejects.toMatchObject({ name: 'ListNotFound' });
  });

  it('deletes an owned list', async () => {
    (ListDB.findListById as jest.Mock).mockResolvedValue({ id: 'l1', userId: 'u1' });
    await deleteList('u1', 'l1');
    expect(ListDB.deleteList).toHaveBeenCalledWith('l1');
  });
});

describe('assignToList', () => {
  it('removes the subscription from any list when listId is null', async () => {
    await assignToList('sub1', null);
    expect(ListDB.removeSubscriptionFromList).toHaveBeenCalledWith('sub1');
    expect(ListDB.assignSubscriptionToList).not.toHaveBeenCalled();
  });

  it('assigns the subscription to the given list', async () => {
    await assignToList('sub1', 'l1');
    expect(ListDB.assignSubscriptionToList).toHaveBeenCalledWith('sub1', 'l1');
  });
});

describe('getTrackersByList', () => {
  const subs = [
    { id: 's1', productId: 'p1' },
    { id: 's2', productId: 'p2' },
  ];
  const products = [
    { id: 'p1', title: 'A' },
    { id: 'p2', title: 'B' },
  ];

  beforeEach(() => {
    (SubscriptionDB.findSubscriptionsByUser as jest.Mock).mockResolvedValue(subs);
    (ProductDB.findProductsByUser as jest.Mock).mockResolvedValue(products);
  });

  it("returns everything for 'all'", async () => {
    const res = await getTrackersByList('u1', 'all');
    expect(res).toHaveLength(2);
  });

  it("filters to unlisted for 'unlisted'", async () => {
    (ListDB.findUnlistedSubscriptionIds as jest.Mock).mockResolvedValue(['s2']);
    const res = await getTrackersByList('u1', 'unlisted');
    expect(res.map((r) => r.subscription.id)).toEqual(['s2']);
  });

  it('filters to a specific list id', async () => {
    (ListDB.findSubscriptionIdsByList as jest.Mock).mockResolvedValue(['s1']);
    const res = await getTrackersByList('u1', 'l1');
    expect(res.map((r) => r.subscription.id)).toEqual(['s1']);
  });
});
