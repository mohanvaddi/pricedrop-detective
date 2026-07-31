import { resetDb } from './db-helpers';
import { getScraperSession, upsertScraperSession, deleteScraperSession } from '../src/db/sessions';

beforeEach(async () => {
  await resetDb();
});

describe('scraper sessions DB layer', () => {
  it('returns null when no session exists', async () => {
    expect(await getScraperSession('ajio')).toBeNull();
  });

  it('upserts a new session and reads it back', async () => {
    await upsertScraperSession({ platform: 'ajio', cookie: '[{"n":1}]', userAgent: 'UA', expiresAt: new Date(Date.now() + 60_000) });
    const s = await getScraperSession('ajio');
    expect(s?.cookie).toBe('[{"n":1}]');
    expect(s?.userAgent).toBe('UA');
  });

  it('overwrites the existing row on conflict (one row per platform)', async () => {
    await upsertScraperSession({ platform: 'ajio', cookie: 'old', userAgent: 'UA1' });
    await upsertScraperSession({ platform: 'ajio', cookie: 'new', userAgent: 'UA2' });
    const s = await getScraperSession('ajio');
    expect(s?.cookie).toBe('new');
    expect(s?.userAgent).toBe('UA2');
  });

  it('deletes a session', async () => {
    await upsertScraperSession({ platform: 'ajio', cookie: 'x', userAgent: 'UA' });
    await deleteScraperSession('ajio');
    expect(await getScraperSession('ajio')).toBeNull();
  });
});
