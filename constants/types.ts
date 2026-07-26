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
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;  // UUID
  product_id: string;
  alert_price: number | null;
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
