import { resetDb, makeUser, makeProduct } from './db-helpers';
import * as SubscriptionDB from '../src/db/subscriptions';
import { findOrCreateTelegramUser, findOrCreateRedditUser, createWebUser } from '../src/db/users';

beforeEach(async () => {
  await resetDb();
});

describe('subscriptions DB layer', () => {
  it('inserts and finds a subscription', async () => {
    const user = await makeUser();
    await makeProduct('p1');
    await SubscriptionDB.insertSubscription(user, 'p1', 500, false);
    const sub = await SubscriptionDB.findSubscription(user, 'p1');
    expect(sub?.alertPrice).toBe(500);
    expect(sub?.notifyEveryChange).toBe(false);
  });

  it('findSubscriptionsByUser lists all of a user’s subscriptions', async () => {
    const user = await makeUser();
    await makeProduct('p1');
    await makeProduct('p2');
    await SubscriptionDB.insertSubscription(user, 'p1');
    await SubscriptionDB.insertSubscription(user, 'p2');
    const subs = await SubscriptionDB.findSubscriptionsByUser(user);
    expect(subs).toHaveLength(2);
  });

  it('setAlertPrice updates the alert and flag', async () => {
    const user = await makeUser();
    await makeProduct('p1');
    await SubscriptionDB.insertSubscription(user, 'p1');
    await SubscriptionDB.setAlertPrice(user, 'p1', 250, false);
    const sub = await SubscriptionDB.findSubscription(user, 'p1');
    expect(sub?.alertPrice).toBe(250);
    expect(sub?.notifyEveryChange).toBe(false);
  });

  it('deleteSubscription removes the row', async () => {
    const user = await makeUser();
    await makeProduct('p1');
    await SubscriptionDB.insertSubscription(user, 'p1');
    await SubscriptionDB.deleteSubscription(user, 'p1');
    expect(await SubscriptionDB.findSubscription(user, 'p1')).toBeNull();
  });

  it('findSubscribersForProduct resolves the channel via provider tables', async () => {
    const tgUser = await findOrCreateTelegramUser(123456, 'tg_user');
    const rdUser = await findOrCreateRedditUser('reddit_user');
    const webUser = await createWebUser('a@b.com', 'hash', 'Web User');
    await makeProduct('p1');
    await SubscriptionDB.insertSubscription(tgUser, 'p1');
    await SubscriptionDB.insertSubscription(rdUser, 'p1');
    await SubscriptionDB.insertSubscription(webUser, 'p1');

    const subs = await SubscriptionDB.findSubscribersForProduct('p1');
    const byChannel = Object.fromEntries(subs.map((s) => [s.channel, s.channel_id]));
    expect(byChannel['telegram']).toBe('123456');
    expect(byChannel['reddit']).toBe('reddit_user');
    expect(byChannel['web']).toBe('a@b.com');
  });
});
