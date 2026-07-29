// Shared types used by both backend and frontend.
// Declared explicitly here so the frontend build doesn't pull in drizzle-orm.

export type User = {
  id: string;
  createdAt: Date;
};

export type TelegramUser = {
  userId: string;
  telegramId: number;
  username: string;
};

export type WebUser = {
  userId: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  createdAt: Date;
};

export type RedditUser = {
  userId: string;
  redditUsername: string;
};

export type Product = {
  id: string;
  url: string;
  website: string;
  title: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  scrapeInterval: number;
  priority: string;
  createdAt: Date;
};

export type Subscription = {
  id: string;
  userId: string;
  productId: string;
  alertPrice: number | null;
  notifyEveryChange: boolean;
  createdAt: Date;
};

export type Price = {
  id: string;
  price: number;
  productId: string;
  createdAt: Date;
};

export type ProductMetrics = {
  productId: string;
  initialPrice: number | null;
  currentPrice: number | null;
  allTimeLow: number | null;
  lastScrapedAt: Date | null;
  lastPriceChangeAt: Date | null;
  failureCount: number;
  updatedAt: Date;
};

export type List = {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  createdAt: Date;
};

export type ListItem = {
  id: string;
  listId: string;
  subscriptionId: string;
  createdAt: Date;
};

export interface EnrichedProduct extends Product {
  subscriberCount: number;
  rankScore: number;
  initialPrice: number | null;
  currentPrice: number | null;
  allTimeLow: number | null;
  addedBy: string | null;
}

export type CustomErrorType = {
  error: true;
  message: string;
  name: string;
};

