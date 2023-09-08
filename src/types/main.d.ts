import { NewTrackerDTO } from '../schemas/zod.schema';

export type Website = typeof NewTrackerDTO._type.website;
export interface Tracker {
  website: Website;
  url: string;
  prices: number[];
}
export interface TrackerData {
  [hash: string]: Tracker;
}

export type CustomError = {
  error: true;
  message: string;
  name: string;
};

export interface TrackedResults {
  url: string;
  website: Website;
  currentPrice: number;
  recentPrice: number;
}
