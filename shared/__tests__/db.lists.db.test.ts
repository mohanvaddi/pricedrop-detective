import { resetDb, makeUser, makeProduct } from './db-helpers';
import * as ListDB from '../src/db/lists';
import * as SubscriptionDB from '../src/db/subscriptions';
import { createWebUser } from '../src/db/users';
import { insertPrice } from '../src/db/prices';

beforeEach(async () => {
  await resetDb();
});

describe('lists DB layer', () => {
  it('creates, finds and counts lists per user', async () => {
    const user = await makeUser();
    const list = await ListDB.insertList(user, 'Wishlist');
    expect(list.name).toBe('Wishlist');
    expect(await ListDB.countListsByUser(user)).toBe(1);
    expect((await ListDB.findListsByUser(user)).map((l) => l.name)).toEqual(['Wishlist']);
    expect((await ListDB.findListById(list.id))?.id).toBe(list.id);
  });

  it('enforces the unique (user, name) constraint', async () => {
    const user = await makeUser();
    await ListDB.insertList(user, 'Dup');
    await expect(ListDB.insertList(user, 'Dup')).rejects.toMatchObject({ cause: { code: '23505' } });
  });

  it('assigns and re-assigns a subscription to a single list', async () => {
    const user = await makeUser();
    await makeProduct('p1');
    await SubscriptionDB.insertSubscription(user, 'p1');
    const sub = (await SubscriptionDB.findSubscriptionsByUser(user))[0]!;
    const listA = await ListDB.insertList(user, 'A');
    const listB = await ListDB.insertList(user, 'B');

    await ListDB.assignSubscriptionToList(sub.id, listA.id);
    expect((await ListDB.findListItemBySubscription(sub.id))?.listId).toBe(listA.id);

    // Re-assign (upsert path) — still one row, now pointing at B.
    await ListDB.assignSubscriptionToList(sub.id, listB.id);
    expect((await ListDB.findListItemBySubscription(sub.id))?.listId).toBe(listB.id);
    expect(await ListDB.findSubscriptionIdsByList(listA.id)).toEqual([]);
    expect(await ListDB.findSubscriptionIdsByList(listB.id)).toEqual([sub.id]);
  });

  it('computes item counts and unlisted subscriptions', async () => {
    const user = await makeUser();
    await makeProduct('p1');
    await makeProduct('p2');
    await SubscriptionDB.insertSubscription(user, 'p1');
    await SubscriptionDB.insertSubscription(user, 'p2');
    const subs = await SubscriptionDB.findSubscriptionsByUser(user);
    const list = await ListDB.insertList(user, 'Grouped');
    await ListDB.assignSubscriptionToList(subs[0]!.id, list.id);

    const counts = await ListDB.getListItemCounts(user);
    expect(counts[list.id]).toBe(1);
    const unlisted = await ListDB.findUnlistedSubscriptionIds(user);
    expect(unlisted).toEqual([subs[1]!.id]);
  });

  it('removeSubscriptionFromList clears the assignment', async () => {
    const user = await makeUser();
    await makeProduct('p1');
    await SubscriptionDB.insertSubscription(user, 'p1');
    const sub = (await SubscriptionDB.findSubscriptionsByUser(user))[0]!;
    const list = await ListDB.insertList(user, 'A');
    await ListDB.assignSubscriptionToList(sub.id, list.id);
    await ListDB.removeSubscriptionFromList(sub.id);
    expect(await ListDB.findListItemBySubscription(sub.id)).toBeNull();
  });

  it('findPublicListWithProducts returns products only for public lists', async () => {
    const user = await createWebUser('owner@x.com', 'hash', 'Owner');
    await makeProduct('p1', { title: 'Gadget' });
    await SubscriptionDB.insertSubscription(user, 'p1');
    await insertPrice('p1', 1500, true);
    const sub = (await SubscriptionDB.findSubscriptionsByUser(user))[0]!;
    const list = await ListDB.insertList(user, 'Public'); // isPublic defaults to true
    await ListDB.assignSubscriptionToList(sub.id, list.id);

    const publicData = await ListDB.findPublicListWithProducts(list.id);
    expect(publicData?.ownerName).toBe('Owner');
    expect(publicData?.products.map((p) => p.title)).toEqual(['Gadget']);
    expect(publicData?.products[0]!.currentPrice).toBe(1500);

    // Make it private → null.
    await ListDB.updateList(list.id, { isPublic: false });
    expect(await ListDB.findPublicListWithProducts(list.id)).toBeNull();
  });

  it('deleteList removes the list', async () => {
    const user = await makeUser();
    const list = await ListDB.insertList(user, 'Temp');
    await ListDB.deleteList(list.id);
    expect(await ListDB.findListById(list.id)).toBeNull();
  });
});
