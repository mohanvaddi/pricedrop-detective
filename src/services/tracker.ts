import { z } from 'zod';
import * as ProductDB from '../db/products';
import * as SubscriptionDB from '../db/subscriptions';
import * as PriceDB from '../db/prices';
import { scrape, canonicalizeUrl, Platform } from '../scraper';
import { CustomError } from '../../constants/error';
import { Product, Subscription } from '../../constants/types';
import { NewTrackerDTO, detectPlatform } from '../constants/schema';
import { caluculateHash } from '../constants/utils';

const MAX_TRACKERS_PER_USER = 10;

export async function createTracker(
  userId: string,
  body: z.infer<typeof NewTrackerDTO>,
): Promise<{ hash: string; currentPrice: number }> {
  const { url } = body;

  const platform = (body.website as Platform | undefined) ?? detectPlatform(url);
  if (!platform) {
    throw new CustomError(
      'Could not detect platform from URL. Please specify: amazon or flipkart.',
      'PlatformNotDetected',
    );
  }

  const subscriptions = await SubscriptionDB.findSubscriptionsByUser(userId);
  if (subscriptions.length >= MAX_TRACKERS_PER_USER) {
    throw new CustomError(
      `You have reached the limit of ${MAX_TRACKERS_PER_USER} trackers. Delete one before adding a new one.`,
      'TrackerLimitReached',
    );
  }

  const canonicalId = canonicalizeUrl(platform, url);
  const hash = caluculateHash(JSON.stringify({ website: platform, canonicalId }));

  const existingProduct = await ProductDB.findProduct(hash);

  if (existingProduct) {
    const existingSub = await SubscriptionDB.findSubscription(userId, hash);
    if (existingSub) throw new CustomError('Tracker Already Exists', 'TrackerExists');

    // Product exists but this user isn't subscribed yet — subscribe without re-scraping
    await SubscriptionDB.insertSubscription(userId, hash);
    const latestPrice = await PriceDB.findLatestPrice(hash);
    return { hash, currentPrice: latestPrice?.price ?? 0 };
  }

  // New product — scrape, persist, then subscribe
  const { currentPrice, title } = await scrape(platform, url);
  await ProductDB.insertProduct(hash, url, platform, title);
  await PriceDB.insertPrice(hash, currentPrice);
  await SubscriptionDB.insertSubscription(userId, hash);

  return { hash, currentPrice };
}

export async function removeTracker(hash: string, userId: string): Promise<void> {
  const subscription = await SubscriptionDB.findSubscription(userId, hash);
  if (!subscription) throw new CustomError('Tracker not found.', 'TrackerNotFound');
  await SubscriptionDB.deleteSubscription(userId, hash);
}

export async function checkPriceChange(product: Product): Promise<{ currentPrice: number; recentPrice: number }> {
  const { id: productId, url, website } = product;

  const latestPrice = await PriceDB.findLatestPrice(productId);
  if (!latestPrice) throw new CustomError("Price didn't change", 'PriceNotChanged', { url, website });
  const recentPrice = latestPrice.price;

  const { currentPrice } = await scrape(website as Platform, url);

  if (currentPrice === recentPrice) {
    throw new CustomError("Price didn't change", 'PriceNotChanged', { url, website });
  }

  await PriceDB.insertPrice(productId, currentPrice);
  return { recentPrice, currentPrice };
}

export async function setTrackerAlert(hash: string, userId: string, alertPrice: number | null): Promise<void> {
  const subscription = await SubscriptionDB.findSubscription(userId, hash);
  if (!subscription) throw new CustomError('Tracker not found.', 'TrackerNotFound');
  await SubscriptionDB.setAlertPrice(userId, hash, alertPrice);
}

export async function getAllActiveProducts(): Promise<Product[]> {
  return ProductDB.findAllActiveProducts();
}

export async function getTrackersByUser(userId: string): Promise<{ product: Product; subscription: Subscription }[]> {
  const products = await ProductDB.findProductsByUser(userId);
  const subscriptions = await SubscriptionDB.findSubscriptionsByUser(userId);
  const subMap = new Map(subscriptions.map((s) => [s.product_id, s]));
  return products.map((product) => ({ product, subscription: subMap.get(product.id)! }));
}

export async function getTracker(hash: string, userId: string): Promise<{ product: Product; subscription: Subscription }> {
  const product = await ProductDB.findProduct(hash);
  if (!product) throw new CustomError('Tracker not found', 'TrackerNotFound');
  const subscription = await SubscriptionDB.findSubscription(userId, hash);
  if (!subscription) throw new CustomError('Tracker not found', 'TrackerNotFound');
  return { product, subscription };
}
