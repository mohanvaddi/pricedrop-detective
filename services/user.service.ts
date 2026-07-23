import * as UserRepo from '../repositories/user.repository';

export async function getOrCreateUser(userId: number, username: string): Promise<void> {
  const existing = await UserRepo.findUser(userId);
  if (!existing) {
    await UserRepo.insertUser(userId, username);
  }
}
