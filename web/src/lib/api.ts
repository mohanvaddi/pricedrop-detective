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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  created_at: string;
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
  created_at: string;
}

export interface TrackerEntry {
  product: Product;
  subscription: Subscription;
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ token: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) =>
      request<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  },
  products: {
    list: () => request<{ data: Product[] }>('/products').then((r) => r.data),
    get: (id: string) => request<{ data: Product }>(`/products/${id}`).then((r) => r.data),
    prices: (id: string) => request<{ data: Price[] }>(`/products/${id}/prices`).then((r) => r.data),
  },
  subscriptions: {
    list: () => request<{ data: TrackerEntry[] }>('/subscriptions').then((r) => r.data),
    create: (url: string) =>
      request<{ data: { hash: string; currentPrice: number } }>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    delete: (productId: string) => request<void>(`/subscriptions/${productId}`, { method: 'DELETE' }),
    setAlert: (productId: string, alertPrice: number | null) =>
      request<void>(`/subscriptions/${productId}/alert`, {
        method: 'PATCH',
        body: JSON.stringify({ alertPrice }),
      }),
  },
};
