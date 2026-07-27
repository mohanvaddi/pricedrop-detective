export type CustomErrorType = {
  error: true;
  message: string;
  name: string;
};

export interface Product {
  id: string;
  url: string;
  website: string;
  title: string | null;
  thumbnail_url: string | null;
  view_count: number;
  scrape_interval: number;
  priority: string;
  created_at: string;
}

export interface EnrichedProduct extends Product {
  subscriber_count: number;
  rank_score: number;
  initial_price: number | null;
  current_price: number | null;
  all_time_low: number | null;
  added_by: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;  // UUID
  product_id: string;
  alert_price: number | null;
  notify_every_change: boolean;
  created_at: string;
}

export interface User {
  created_at: string;
  id: string;  // UUID
}

export interface TelegramUser {
  user_id: string;
  telegram_id: number;
  username: string;
}

export interface WebUser {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface RedditUser {
  user_id: string;
  reddit_username: string;
}

export interface Price {
  created_at: string;
  id: string;
  price: number;
  product_id: string;
}

export interface ProductMetrics {
  product_id: string;
  initial_price: number | null;
  current_price: number | null;
  all_time_low: number | null;
  last_scraped_at: string | null;
  last_price_change_at: string | null;
  failure_count: number;
  updated_at: string;
}
