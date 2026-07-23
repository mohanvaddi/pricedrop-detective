import { supabase } from './supabase.client';
import { Price } from '../types/main';
import { CustomError } from '../lib/custom.error';

export async function findPricesByTracker(hash: string): Promise<Price[]> {
  const { data, error } = await supabase
    .from('prices')
    .select()
    .eq('tracker', hash)
    .order('created_at', { ascending: true });
  if (error) throw new CustomError('Unable to fetch prices', 'PricesError', { error });
  return (data ?? []) as Price[];
}

export async function findLatestPrice(hash: string): Promise<Price | null> {
  const { data, error } = await supabase
    .from('prices')
    .select()
    .eq('tracker', hash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new CustomError('Unable to fetch latest price', 'PricesError', { error });
  return data as Price | null;
}

export async function insertPrice(hash: string, price: number): Promise<void> {
  const { error } = await supabase.from('prices').insert({ tracker: hash, price });
  if (error) throw new CustomError('Unable to create price', 'PriceNotCreated', { error });
}
