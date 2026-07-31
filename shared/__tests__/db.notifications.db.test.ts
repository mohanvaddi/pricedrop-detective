import { resetDb, makeProduct } from './db-helpers';
import { enqueueNotification, findPendingNotifications, markNotificationSent } from '../src/db/notifications';

beforeEach(async () => {
  await resetDb();
});

describe('notifications DB layer', () => {
  it('enqueues and fetches pending notifications in FIFO order', async () => {
    await makeProduct('p1');
    await enqueueNotification('p1', 'drop', 1000, 800);
    await enqueueNotification('p1', 'increase', 800, 900);
    const pending = await findPendingNotifications(10);
    expect(pending).toHaveLength(2);
    expect(pending[0]!.changeType).toBe('drop'); // earliest first
    expect(pending[1]!.changeType).toBe('increase');
  });

  it('markNotificationSent removes it from the pending set', async () => {
    await makeProduct('p1');
    await enqueueNotification('p1', 'drop', 1000, 800);
    const [n] = await findPendingNotifications(10);
    await markNotificationSent(n!.id);
    expect(await findPendingNotifications(10)).toHaveLength(0);
  });

  it('respects the limit argument', async () => {
    await makeProduct('p1');
    await enqueueNotification('p1', 'drop', 1000, 900);
    await enqueueNotification('p1', 'drop', 900, 800);
    await enqueueNotification('p1', 'drop', 800, 700);
    expect(await findPendingNotifications(2)).toHaveLength(2);
  });
});
