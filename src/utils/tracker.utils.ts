import { z } from 'zod';
import { NewTrackerDTO } from '../schemas/zod.schema';
import { caluculateHash } from './hash.utils';
import { extractPrice } from './extractor.utils';
import { CustomError } from '../lib/custom.error';
import SupabaseUtils from './supabse.utils';

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

  // track = async (hash: string) => {
  //   return new Promise<TrackedResults>(async (resolve, reject) => {
  //     const trackers = this.getTrackerData();
  //     const tracker = trackers[hash]!;
  //     const { prices, url, website } = tracker;

  //     let currentPrice: number;
  //     try {
  //       currentPrice = await extractPrice(website, url);
  //     } catch (error) {
  //       return reject(new CustomError('Unable to get price', 'PriceNotFound', { url, website }));
  //     }

  //     const recentPrice: number = prices[prices.length - 1]!;

  //     // if price didn't change do nothing
  //     if (currentPrice === recentPrice)
  //       return reject(new CustomError("Price didn't change", 'PriceNotChanged', { url, website }));

  //     // update the latest price in tracker data
  //     trackers[hash] = {
  //       ...tracker,
  //       prices: [...prices, currentPrice],
  //     };
  //     this.setTrackerData(trackers);

  //     return resolve({
  //       url,
  //       website,
  //       recentPrice,
  //       currentPrice,
  //     });
  //   });
  // };
}
