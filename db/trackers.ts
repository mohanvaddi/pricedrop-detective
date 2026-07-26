import { pool } from './client';
import { Tracker } from '../constants/types';
import { CustomError } from '../constants/error';
import { Platform } from '../scraper';

export async function findTracker(hash: string): Promise<Tracker | null> {
  try {
    const { rows } = await pool.query<Tracker>('SELECT * FROM trackers WHERE id = $1', [hash]);
    return rows[0] ?? null;
  } catch (error) {
    throw new CustomError('Unable to get tracker', 'TrackerNotFound', { error });
  }
}

export async function findTrackersByUser(userId: number): Promise<Tracker[]> {
  try {
    const { rows } = await pool.query<Tracker>('SELECT * FROM trackers WHERE "user" = $1', [userId]);
    return rows;
  } catch (error) {
    throw new CustomError('Unable to fetch trackers', 'TrackersError', { error });
  }
}

export async function findAllTrackers(): Promise<Tracker[]> {
  try {
    const { rows } = await pool.query<Tracker>('SELECT * FROM trackers');
    return rows;
  } catch (error) {
    throw new CustomError('Unable to fetch trackers', 'TrackersError', { error });
  }
}

export async function insertTracker(
  hash: string,
  userId: number,
  url: string,
  website: Platform,
  title: string | null,
): Promise<void> {
  try {
    await pool.query('INSERT INTO trackers (id, "user", url, website, title) VALUES ($1, $2, $3, $4, $5)', [
      hash,
      userId,
      url,
      website,
      title,
    ]);
  } catch (error) {
    throw new CustomError('Unable to add tracker', 'TrackerInsertionFailed', { error });
  }
}

export async function deleteTracker(hash: string): Promise<void> {
  try {
    await pool.query('DELETE FROM trackers WHERE id = $1', [hash]);
  } catch (error) {
    throw new CustomError('Unable to delete tracker', 'TrackerNotDeleted', { error });
  }
}

export async function updateTrackerTitle(hash: string, title: string): Promise<void> {
  try {
    await pool.query('UPDATE trackers SET title = $1 WHERE id = $2', [title, hash]);
  } catch (error) {
    throw new CustomError('Unable to update tracker title', 'TrackerUpdateError', { error });
  }
}

export async function setAlertPrice(hash: string, alertPrice: number | null): Promise<void> {
  try {
    await pool.query('UPDATE trackers SET alert_price = $1 WHERE id = $2', [alertPrice, hash]);
  } catch (error) {
    throw new CustomError('Unable to set alert price', 'TrackerUpdateError', { error });
  }
}
