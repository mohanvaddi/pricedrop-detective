import { eq, sql } from 'drizzle-orm';
import { db } from './client';
import { scraperSessions } from './schema';
import { type ScraperSession, type NewScraperSession } from './schema';
import { CustomError } from '../error';

export type { ScraperSession, NewScraperSession };

/** Read the stored session for a platform, or null if none exists. */
export async function getScraperSession(platform: string): Promise<ScraperSession | null> {
  try {
    const rows = await db.select().from(scraperSessions).where(eq(scraperSessions.platform, platform)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to read scraper session', 'ScraperSessionReadFailed', { error });
  }
}

/** Insert or replace the session for a platform (one row per platform). */
export async function upsertScraperSession(row: NewScraperSession): Promise<void> {
  try {
    await db
      .insert(scraperSessions)
      .values({ ...row, updatedAt: sql`now()` })
      .onConflictDoUpdate({
        target: scraperSessions.platform,
        set: {
          cookie: row.cookie,
          userAgent: row.userAgent,
          headers: row.headers ?? null,
          expiresAt: row.expiresAt ?? null,
          updatedAt: sql`now()`,
        },
      });
  } catch (error) {
    throw new CustomError('Unable to persist scraper session', 'ScraperSessionWriteFailed', { error });
  }
}

/** Delete a platform's session (called when it is detected as expired). */
export async function deleteScraperSession(platform: string): Promise<void> {
  try {
    await db.delete(scraperSessions).where(eq(scraperSessions.platform, platform));
  } catch {
    // Non-fatal — a stale row will simply be overwritten on the next regeneration.
  }
}
