import { resetDb } from './db-helpers';
import { findOrCreateTelegramUser, findOrCreateRedditUser, createWebUser, findWebUserByEmail, findUser } from '../src/db/users';

beforeEach(async () => {
  await resetDb();
});

describe('users DB layer', () => {
  it('findOrCreateTelegramUser is idempotent per telegram id', async () => {
    const first = await findOrCreateTelegramUser(999, 'alice');
    const second = await findOrCreateTelegramUser(999, 'alice-renamed');
    expect(first).toBe(second);
    expect(await findUser(first)).not.toBeNull();
  });

  it('findOrCreateRedditUser is idempotent per username', async () => {
    const first = await findOrCreateRedditUser('bob');
    const second = await findOrCreateRedditUser('bob');
    expect(first).toBe(second);
  });

  it('creates a web user and finds it by email', async () => {
    const userId = await createWebUser('c@d.com', 'hashed-pw', ' Carol ');
    const found = await findWebUserByEmail('c@d.com');
    expect(found?.userId).toBe(userId);
    expect(found?.passwordHash).toBe('hashed-pw');
  });

  it('findWebUserByEmail returns null for an unknown email', async () => {
    expect(await findWebUserByEmail('nobody@x.com')).toBeNull();
  });
});
