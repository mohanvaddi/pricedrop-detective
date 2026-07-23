import { supabase } from './supabase.client';
import { Tracker } from '../types/main';
import { CustomError } from '../lib/custom.error';
import { Platform } from '../scrapers/scraper';

export async function findTracker(hash: string): Promise<Tracker | null> {
  const { data, error } = await supabase.from('trackers').select().eq('id', hash).maybeSingle();
  if (error) throw new CustomError('Unable to get tracker', 'TrackerNotFound', { error });
  return data as Tracker | null;
}

export async function findTrackersByUser(userId: number): Promise<Tracker[]> {
  const { data, error } = await supabase.from('trackers').select().eq('user', userId);
  if (error) throw new CustomError('Unable to fetch trackers', 'TrackersError', { error });
  return (data ?? []) as Tracker[];
}

export async function findAllTrackers(): Promise<Tracker[]> {
  const { data, error } = await supabase.from('trackers').select();
  if (error) throw new CustomError('Unable to fetch trackers', 'TrackersError', { error });
  return (data ?? []) as Tracker[];
}

export async function insertTracker(
  hash: string,
  userId: number,
  url: string,
  website: Platform,
  title: string | null
): Promise<void> {
  const { error } = await supabase.from('trackers').insert({ id: hash, user: userId, url, website, title });
  if (error) throw new CustomError('Unable to add tracker', 'TrackerInsertionFailed', { error });
}

export async function deleteTracker(hash: string): Promise<void> {
  const { error } = await supabase.from('trackers').delete().eq('id', hash);
  if (error) throw new CustomError('Unable to delete tracker', 'TrackerNotDeleted', { error });
}

export async function updateTrackerTitle(hash: string, title: string): Promise<void> {
  const { error } = await supabase.from('trackers').update({ title }).eq('id', hash);
  if (error) throw new CustomError('Unable to update tracker title', 'TrackerUpdateError', { error });
}

export async function setAlertPrice(hash: string, alertPrice: number | null): Promise<void> {
  const { error } = await supabase.from('trackers').update({ alert_price: alertPrice }).eq('id', hash);
  if (error) throw new CustomError('Unable to set alert price', 'TrackerUpdateError', { error });
}
