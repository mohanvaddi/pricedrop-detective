import { NewTrackerDTO } from '../schemas/zod.schema';

export type Website = typeof NewTrackerDTO._type.website;

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

// extracted types
export interface Tracker {
  created_at: string;
  id: string;
  url: string;
  user: number;
  title: string | null;
  website: string;
}

export interface User {
  created_at: string;
  id: number;
  username: string;
}

export interface Price {
  created_at: string;
  id: string;
  price: number;
  tracker: string;
}
