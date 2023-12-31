import { z } from 'zod';
import { NewTrackerDTO } from '../schemas/zod.schema';
import { caluculateHash } from './hash.utils';
import { extractData, extractPrice } from './extractor.utils';
import { CustomError } from '../lib/custom.error';
import SupabaseUtils from './supabse.utils';
import { Tracker, Website } from '../types/main';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';

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

      let title: string | null, currentPrice: number;
      try {
        const data = await extractData(website, url);
        title = data.title;
        currentPrice = data.currentPrice;
        await this.supabase.insertTracker(hash, userId, url, website, title);
        await this.supabase.insertPrice(hash, currentPrice);
      } catch (error) {
        if (error instanceof CustomError) {
          return reject(error);
        }
        return reject('Unexpected error:: Unable to get price');
      }

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
        const client = axios.create({});
        axiosRetry(client, { retries: 5 });
        const { data } = await client.get(url);
        const $: cheerio.CheerioAPI = cheerio.load(data);
        currentPrice = await extractPrice(website as Website, $);
      } catch (error) {
        if (error instanceof CustomError) {
          return reject(error);
        }
        return reject('Unexpected error:: Unable to get price');
      }
      const recentPrice: number = prices[prices.length - 1]!.price;

      // if price didn't change do nothing
      if (currentPrice === recentPrice) {
        return reject(new CustomError("Price didn't change", 'PriceNotChanged', { url, website }));
      }

      await this.supabase.insertPrice(hash, currentPrice).catch((err) => {
        return reject(new CustomError('Unable to insert price', 'PriceError', { err }));
      });

      return resolve({
        recentPrice,
        currentPrice,
      });
    });
  };
}
