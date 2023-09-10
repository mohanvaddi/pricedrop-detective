import { z } from 'zod';
import { NewTrackerDTO } from '../schemas/zod.schema';
import { caluculateHash } from './hash.utils';
import { extractPrice } from './extractor.utils';
import { CustomError } from '../lib/custom.error';
import SupabaseUtils from './supabse.utils';
import { Tracker } from '../types/main';
import { SUPPORTED_SITES } from '../types/enums';

export default class TrackerUtils {
  private supabase = new SupabaseUtils();

  createTracker = (userId: number, body: z.infer<typeof NewTrackerDTO>) => {
    return new Promise<{ hash: string; currentPrice: number }>(async (resolve, reject) => {
      const { website, url } = body;

      const hash = caluculateHash(JSON.stringify({ website, url }));
      const trackerExists = await this.supabase.checkIfTrackerExists(hash);
      if (trackerExists) {
        return reject(new CustomError('Tracker Already Exists', 'TrackerExists'));
      }

      let currentPrice: number;
      try {
        currentPrice = await extractPrice(website, url);
      } catch (error) {
        return reject(new CustomError('Unable to get price for given url', 'PriceNotFound'));
      }

      await this.supabase.insertTracker(hash, userId, url, website);
      await this.supabase.insertPrice(hash, currentPrice);
      return resolve({ hash, currentPrice });
    });
  };

  removeTracker = (hash: string) => {
    return new Promise<string>(async (resolve, reject) => {
      await this.supabase.removeTracker(hash).catch((error) => {
        return reject(
          new CustomError('Unable to remove tracker', 'TrackerError', {
            error,
          })
        );
      });
      return resolve(`Tracker Deleted`);
    });
  };

  track = async (tracker: Tracker) => {
    return new Promise<{ currentPrice: number; recentPrice: number }>(async (resolve, reject) => {
      const { id: hash, url, website } = tracker;
      const prices = await this.supabase.fetchPricesByTracker(tracker.id);

      let currentPrice: number;
      try {
        currentPrice = await extractPrice(website as SUPPORTED_SITES, url);
      } catch (error) {
        return reject(new CustomError('Unable to get price', 'PriceNotFound', { url, website }));
      }
      const recentPrice: number = prices[prices.length - 1]!.price;

      // if price didn't change do nothing
      if (currentPrice === recentPrice) {
        return reject(new CustomError("Price didn't change", 'PriceNotChanged', { url, website }));
      }

      await this.supabase.insertPrice(hash, currentPrice).catch((err) => {
        return reject(new CustomError('Unable to inser price', 'PriceError', { err }));
      });

      return resolve({
        recentPrice,
        currentPrice,
      });
    });
  };
}
