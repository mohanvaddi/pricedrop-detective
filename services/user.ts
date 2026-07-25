import * as UserDB from '../db/users';

export async function getOrCreateUser(userId: number, username: string): Promise<void> {
  const existing = await UserDB.findUser(userId);
  if (!existing) {
    await UserDB.insertUser(userId, username);
  }
}
