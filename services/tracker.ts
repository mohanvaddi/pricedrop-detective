import { z } from 'zod';
import * as TrackerDB from '../db/trackers';
import * as PriceDB from '../db/prices';
import { scrape, extractPrice, fetchPage, Platform } from '../scraper';
import { CustomError } from '../constants/error';
import { Tracker } from '../constants/types';
import { NewTrackerDTO, detectPlatform } from '../constants/schema';
import { caluculateHash } from '../constants/utils';

const MAX_TRACKERS_PER_USER = 10;

export async function createTracker(
  userId: number,
  body: z.infer<typeof NewTrackerDTO>
): Promise<{ hash: string; currentPrice: number }> {
  const { url } = body;

  const platform = (body.website as Platform | undefined) ?? detectPlatform(url);
  if (!platform) {
    throw new CustomError(
      'Could not detect platform from URL. Please specify: amazon or flipkart.',
      'PlatformNotDetected'
    );
  }

  const existing = await TrackerDB.findTrackersByUser(userId);
  if (existing.length >= MAX_TRACKERS_PER_USER) {
    throw new CustomError(
      `You have reached the limit of ${MAX_TRACKERS_PER_USER} trackers. Delete one before adding a new one.`,
      'TrackerLimitReached'
    );
  }

  const hash = caluculateHash(JSON.stringify({ website: platform, url }));

  const existingTracker = await TrackerDB.findTracker(hash);
  if (existingTracker) throw new CustomError('Tracker Already Exists', 'TrackerExists');

  const { currentPrice, title } = await scrape(platform, url);
  await TrackerDB.insertTracker(hash, userId, url, platform, title);
  await PriceDB.insertPrice(hash, currentPrice);

  return { hash, currentPrice };
}

export async function removeTracker(hash: string, userId: number): Promise<void> {
  const tracker = await TrackerDB.findTracker(hash);
  if (!tracker) throw new CustomError('Tracker not found.', 'TrackerNotFound');
  if (tracker.user !== userId) throw new CustomError('You do not own this tracker.', 'TrackerForbidden');
  await TrackerDB.deleteTracker(hash);
}

export async function checkPriceChange(tracker: Tracker): Promise<{ currentPrice: number; recentPrice: number }> {
  const { id: hash, url, website, alert_price } = tracker;

  const latestPrice = await PriceDB.findLatestPrice(hash);
  if (!latestPrice) throw new CustomError("Price didn't change", 'PriceNotChanged', { url, website });
  const recentPrice = latestPrice.price;

  const $ = await fetchPage(url);
  const currentPrice = extractPrice(website as Platform, $);

  if (currentPrice === recentPrice) {
    throw new CustomError("Price didn't change", 'PriceNotChanged', { url, website });
  }

  await PriceDB.insertPrice(hash, currentPrice);

  if (alert_price !== null && currentPrice > alert_price) {
    throw new CustomError('Price changed but alert threshold not met', 'AlertThresholdNotMet', {
      currentPrice,
      alert_price,
    });
  }

  return { recentPrice, currentPrice };
}

export async function setTrackerAlert(hash: string, userId: number, alertPrice: number | null): Promise<void> {
  const tracker = await TrackerDB.findTracker(hash);
  if (!tracker) throw new CustomError('Tracker not found.', 'TrackerNotFound');
  if (tracker.user !== userId) throw new CustomError('You do not own this tracker.', 'TrackerForbidden');
  await TrackerDB.setAlertPrice(hash, alertPrice);
}

export async function getAllTrackers(): Promise<Tracker[]> {
  return TrackerDB.findAllTrackers();
}

export async function getTracker(hash: string): Promise<Tracker> {
  const tracker = await TrackerDB.findTracker(hash);
  if (!tracker) throw new CustomError('Tracker not found', 'TrackerNotFound');
  return tracker;
}

export async function getTrackersByUser(userId: number): Promise<Tracker[]> {
  return TrackerDB.findTrackersByUser(userId);
}
