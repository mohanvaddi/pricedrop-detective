import { supabase } from './client';
import { User } from '../constants/types';
import { CustomError } from '../constants/error';

export async function findUser(userId: number): Promise<User | null> {
  const { data, error } = await supabase.from('users').select().eq('id', userId).maybeSingle();
  if (error) throw new CustomError('Unable to get user', 'UserNotFound', { error });
  return data as User | null;
}

export async function insertUser(userId: number, username: string): Promise<void> {
  const { error } = await supabase.from('users').insert({ id: userId, username });
  if (error) throw new CustomError('Unable to add user', 'UserInsertionFailed', { error });
}
