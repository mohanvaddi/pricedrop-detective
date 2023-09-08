import * as fs from 'fs';
import path from 'path';
import { TrackedResults, TrackerData } from '../types/main';
import { z } from 'zod';
import { NewTrackerDTO } from '../schemas/zod.schema';
import { caluculateHash } from './hash.utils';
import { extractPrice } from './extractor.utils';
import { CustomError } from '../lib/custom.error';

export default class TrackerUtils {
  trackersFilePath = path.join(__dirname, '../_data/trackers.json');
  constructor() {
    if (!fs.existsSync(this.trackersFilePath)) throw new Error("Trackers file doesn't exist");
  }

  getTrackerData = (): TrackerData => {
    return JSON.parse(fs.readFileSync(this.trackersFilePath, 'utf-8') || '{}');
  };

  setTrackerData = (trackerData: TrackerData) => {
    return fs.writeFileSync(this.trackersFilePath, JSON.stringify(trackerData));
  };

  createTracker = (body: z.infer<typeof NewTrackerDTO>) => {
    return new Promise<{ hash: string; currentPrice: number }>(async (resolve, reject) => {
      const { website, url } = body;

      const hash = caluculateHash(JSON.stringify({ website, url }));
      const trackers = this.getTrackerData();

      if (trackers[hash] !== undefined) {
        return reject(new CustomError('Tracker Already Exists', 'TrackerExists'));
      }

      let currentPrice: number;
      try {
        currentPrice = await extractPrice(website, url);
      } catch (error) {
        return reject(new CustomError('Unable to get price for given url', 'PriceNotFound'));
      }

      trackers[hash] = { prices: [currentPrice], ...body };
      this.setTrackerData(trackers);

      return resolve({ hash, currentPrice });
    });
  };

  removeTracker = (hash: string) => {
    return new Promise<string>(async (resolve, reject) => {
      let trackers = this.getTrackerData();
      if (!trackers.hasOwnProperty(hash)) {
        return reject(new CustomError("Tracker doesn't exist", 'TrackerNotFound'));
      }
      delete trackers[hash];
      this.setTrackerData(trackers);
      return resolve(`Tracker Deleted`);
    });
  };

  track = async (hash: string) => {
    return new Promise<TrackedResults>(async (resolve, reject) => {
      const trackers = this.getTrackerData();
      const tracker = trackers[hash]!;
      const { prices, url, website } = tracker;

      let currentPrice: number;
      try {
        currentPrice = await extractPrice(website, url);
      } catch (error) {
        return reject(new CustomError('Unable to get price', 'PriceNotFound', { url, website }));
      }

      const recentPrice: number = prices[prices.length - 1]!;

      // if price didn't change do nothing
      if (currentPrice === recentPrice)
        return reject(new CustomError("Price didn't change", 'PriceNotChanged', { url, website }));

      // update the latest price in tracker data
      trackers[hash] = {
        ...tracker,
        prices: [...prices, currentPrice],
      };
      this.setTrackerData(trackers);

      return resolve({
        url,
        website,
        recentPrice,
        currentPrice,
      });
    });
  };
}
