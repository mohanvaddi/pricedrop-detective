const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Product {
  id: string;
  url: string;
  website: string;
  title: string | null;
  thumbnail_url: string | null;
  view_count: number;
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

export interface Price {
  id: string;
  price: number;
  product_id: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  alert_price: number | null;
  notify_every_change: boolean;
  created_at: string;
}

export interface TrackerEntry {
  product: Product;
  subscription: Subscription;
}

export interface UserProfile {
  email: string | null;
  display_name: string | null;
  channels: {
    telegram: { telegram_id: number; username: string } | null;
    reddit: { reddit_username: string } | null;
  };
}

export interface Platform {
  id: string;
  name: string;
  fetchMethod: 'axios' | 'browser' | 'curl';
}

export const api = {
  auth: {
    register: (email: string, password: string, displayName?: string) =>
      request<{ token: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, display_name: displayName || undefined }) }),
    login: (email: string, password: string) =>
      request<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  },
  products: {
    list: () => request<{ data: EnrichedProduct[] }>('/products').then((r) => r.data),
    get: (id: string) => request<{ data: Product }>('/products/' + id).then((r) => r.data),
    prices: (id: string) => request<{ data: Price[] }>('/products/' + id + '/prices').then((r) => r.data),
  },
  subscriptions: {
    list: () => request<{ data: TrackerEntry[] }>('/subscriptions').then((r) => r.data),
    create: (url: string, alertPrice?: number | null, notifyEveryChange?: boolean) =>
      request<{ data: { hash: string; currentPrice: number } }>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ url, alertPrice, notifyEveryChange }),
      }),
    delete: (productId: string) => request<void>('/subscriptions/' + productId, { method: 'DELETE' }),
    updateAlert: (productId: string, alertPrice: number | null, notifyEveryChange: boolean) =>
      request<void>('/subscriptions/' + productId + '/alert', {
        method: 'PATCH',
        body: JSON.stringify({ alertPrice, notifyEveryChange }),
      }),
  },
  platforms: {
    list: () => request<{ data: Platform[] }>('/platforms').then((r) => r.data),
  },
  users: {
    me: () => request<{ data: UserProfile }>('/users/me').then((r) => r.data),
    updateMe: (display_name: string) =>
      request<{ message: string }>('/users/me', { method: 'PATCH', body: JSON.stringify({ display_name }) }),
    linkTelegram: (telegram_id: number) =>
      request<{ message: string }>('/users/me/channels/telegram', {
        method: 'POST',
        body: JSON.stringify({ telegram_id }),
      }),
    unlinkTelegram: () => request<void>('/users/me/channels/telegram', { method: 'DELETE' }),
    linkReddit: (reddit_username: string) =>
      request<{ message: string }>('/users/me/channels/reddit', {
        method: 'POST',
        body: JSON.stringify({ reddit_username }),
      }),
    unlinkReddit: () => request<void>('/users/me/channels/reddit', { method: 'DELETE' }),
  },
};
