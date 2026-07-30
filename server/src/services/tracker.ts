import { z } from 'zod';
import * as ProductDB from '@pricedrop/shared/db/products';
import * as SubscriptionDB from '@pricedrop/shared/db/subscriptions';
import * as PriceDB from '@pricedrop/shared/db/prices';
import { CustomError } from '@pricedrop/shared/error';
import { Product, EnrichedProduct, Subscription } from '@pricedrop/shared/types';
import { MAX_TRACKERS_PER_USER } from '@pricedrop/shared/limits';
import { NewTrackerDTO } from '../constants/schema';
import { fetchProductDetails } from './scraperClient';

export async function createTracker(
  userId: string,
  body: z.infer<typeof NewTrackerDTO>,
): Promise<{ hash: string; currentPrice: number }> {
  const { url } = body;

  const subscriptions = await SubscriptionDB.findSubscriptionsByUser(userId);
  if (subscriptions.length >= MAX_TRACKERS_PER_USER) {
    throw new CustomError(
      `You have reached the limit of ${MAX_TRACKERS_PER_USER} trackers. Delete one before adding a new one.`,
      'TrackerLimitReached',
    );
  }

  // The scrapers service detects the platform, canonicalizes the URL, scrapes
  // the details and returns the stable product hash.
  const details = await fetchProductDetails(url, body.website);
  const hash = details.productHash;

  const existingProduct = await ProductDB.findProduct(hash);

  if (existingProduct) {
    const existingSub = await SubscriptionDB.findSubscription(userId, hash);
    if (existingSub) throw new CustomError('Tracker Already Exists', 'TrackerExists');

    // Product exists but this user isn't subscribed yet — subscribe without re-scraping
    await SubscriptionDB.insertSubscription(userId, hash, body.alertPrice, body.notifyEveryChange);
    const latestPrice = await PriceDB.findLatestPrice(hash);
    return { hash, currentPrice: latestPrice?.price ?? details.price };
  }

  // New product — persist the scraped details, then subscribe
  await ProductDB.insertProduct(hash, url, details.platform, details.title, details.thumbnailUrl, details.category);
  await PriceDB.insertPrice(hash, details.price, details.available);
  await SubscriptionDB.insertSubscription(userId, hash, body.alertPrice, body.notifyEveryChange);

  return { hash, currentPrice: details.price };
}

export async function removeTracker(hash: string, userId: string): Promise<void> {
  const subscription = await SubscriptionDB.findSubscription(userId, hash);
  if (!subscription) throw new CustomError('Tracker not found.', 'TrackerNotFound');
  await SubscriptionDB.deleteSubscription(userId, hash);
}

export async function setTrackerAlert(
  hash: string,
  userId: string,
  alertPrice: number | null,
  notifyEveryChange?: boolean,
): Promise<void> {
  const subscription = await SubscriptionDB.findSubscription(userId, hash);
  if (!subscription) throw new CustomError('Tracker not found.', 'TrackerNotFound');
  await SubscriptionDB.setAlertPrice(userId, hash, alertPrice, notifyEveryChange);
}

export async function getAllActiveProducts(): Promise<EnrichedProduct[]> {
  return ProductDB.findAllActiveProducts();
}

export async function getTrackersByUser(userId: string): Promise<{ product: Product; subscription: Subscription }[]> {
  const products = await ProductDB.findProductsByUser(userId);
  const subscriptions = await SubscriptionDB.findSubscriptionsByUser(userId);
  const subMap = new Map(subscriptions.map((s) => [s.productId, s]));
  return products.map((product) => ({ product, subscription: subMap.get(product.id)! }));
}

export async function getTracker(hash: string, userId: string): Promise<{ product: Product; subscription: Subscription }> {
  const product = await ProductDB.findProduct(hash);
  if (!product) throw new CustomError('Tracker not found', 'TrackerNotFound');
  const subscription = await SubscriptionDB.findSubscription(userId, hash);
  if (!subscription) throw new CustomError('Tracker not found', 'TrackerNotFound');
  return { product, subscription };
}
