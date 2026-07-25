import { Platform } from '../scraper';

export type { Platform as Website };

export type CustomErrorType = {
  error: true;
  message: string;
  name: string;
};

export interface TrackedResults {
  url: string;
  website: Platform;
  currentPrice: number;
  recentPrice: number;
}

export interface Tracker {
  created_at: string;
  id: string;
  url: string;
  user: number;
  title: string | null;
  website: string;
  alert_price: number | null;
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
