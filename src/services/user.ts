import { findOrCreateTelegramUser } from '../db/users';

/** Returns the abstract user UUID for the given Telegram user. */
export async function getOrCreateTelegramUser(telegramId: number, username: string): Promise<string> {
  return findOrCreateTelegramUser(telegramId, username);
}
