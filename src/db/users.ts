import { eq } from 'drizzle-orm';
import { db } from './client';
import { users, telegramUsers, redditUsers, webUsers } from './schema';
import { type User } from './schema';
import { CustomError } from '../../constants/error';

export type { User };

export async function findUser(userId: string): Promise<User | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.id, userId));
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to get user', 'UserNotFound', { error });
  }
}

export async function findOrCreateTelegramUser(telegramId: number, username: string): Promise<string> {
  try {
    const existing = await db
      .select({ userId: telegramUsers.userId })
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId));
    if (existing[0]) return existing[0].userId;

    const inserted = await db.insert(users).values({}).returning({ id: users.id });
    const userId = inserted[0]!.id;
    await db.insert(telegramUsers).values({ userId, telegramId, username });
    return userId;
  } catch (error) {
    throw new CustomError('Unable to create Telegram user', 'UserInsertionFailed', { error });
  }
}

export async function findOrCreateRedditUser(redditUsername: string): Promise<string> {
  try {
    const existing = await db
      .select({ userId: redditUsers.userId })
      .from(redditUsers)
      .where(eq(redditUsers.redditUsername, redditUsername));
    if (existing[0]) return existing[0].userId;

    const inserted = await db.insert(users).values({}).returning({ id: users.id });
    const userId = inserted[0]!.id;
    await db.insert(redditUsers).values({ userId, redditUsername });
    return userId;
  } catch (error) {
    throw new CustomError('Unable to create Reddit user', 'UserInsertionFailed', { error });
  }
}

export async function createWebUser(email: string, passwordHash: string, displayName?: string): Promise<string> {
  try {
    const inserted = await db.insert(users).values({}).returning({ id: users.id });
    const userId = inserted[0]!.id;
    await db.insert(webUsers).values({
      userId,
      email,
      passwordHash,
      displayName: displayName?.trim() ?? null,
    });
    return userId;
  } catch (error) {
    throw new CustomError('Unable to create web user', 'UserInsertionFailed', { error });
  }
}

export async function findWebUserByEmail(email: string): Promise<{ userId: string; passwordHash: string } | null> {
  try {
    const rows = await db
      .select({ userId: webUsers.userId, passwordHash: webUsers.passwordHash })
      .from(webUsers)
      .where(eq(webUsers.email, email));
    if (!rows[0]) return null;
    return { userId: rows[0].userId, passwordHash: rows[0].passwordHash };
  } catch (error) {
    throw new CustomError('Unable to find web user', 'UserNotFound', { error });
  }
}


