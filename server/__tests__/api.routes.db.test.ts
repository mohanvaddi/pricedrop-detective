jest.mock('../src/services/scraperClient', () => ({ fetchProductDetails: jest.fn() }));

import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { db } from '@pricedrop/shared/db/client';
import { fetchProductDetails } from '../src/services/scraperClient';
import authRoutes from '../src/api/routes/auth';
import subscriptionRoutes from '../src/api/routes/subscriptions';
import productRoutes from '../src/api/routes/products';

const mockFetch = fetchProductDetails as jest.Mock;

function buildApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/products', productRoutes);
  return app;
}

const app = buildApp();

async function resetDb() {
  await db.execute(sql`
    TRUNCATE TABLE
      list_items, lists, notification_queue, prices, product_metrics,
      subscriptions, products, telegram_users, reddit_users, web_users,
      users, scraper_sessions
    RESTART IDENTITY CASCADE
  `);
}

beforeEach(async () => {
  await resetDb();
  mockFetch.mockResolvedValue({
    platform: 'amazon',
    canonicalId: 'amazon:B09XS7JWHH',
    productHash: 'hash1234',
    price: 4499,
    title: 'Sony WH-1000XM5',
    thumbnailUrl: null,
    available: true,
    category: 'electronics',
  });
});

async function registerAndLogin(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'user@x.com', password: 'password123', display_name: 'User' });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

describe('auth routes', () => {
  it('registers a new user and returns a token', async () => {
    const token = await registerAndLogin();
    expect(typeof token).toBe('string');
  });

  it('rejects a weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('logs in with valid credentials', async () => {
    await registerAndLogin();
    const res = await request(app).post('/api/auth/login').send({ email: 'user@x.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('401s on wrong password', async () => {
    await registerAndLogin();
    const res = await request(app).post('/api/auth/login').send({ email: 'user@x.com', password: 'wrongpass1' });
    expect(res.status).toBe(401);
  });
});

describe('subscription routes (auth required)', () => {
  it('401s without a Bearer token', async () => {
    const res = await request(app).get('/api/subscriptions');
    expect(res.status).toBe(401);
  });

  it('runs the full tracker lifecycle: create → list → prices → alert → delete', async () => {
    const token = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };

    // create
    const create = await request(app).post('/api/subscriptions').set(auth).send({ url: 'https://www.amazon.in/x/dp/B09XS7JWHH' });
    expect(create.status).toBe(201);
    expect(create.body.data.hash).toBe('hash1234');
    expect(create.body.data.currentPrice).toBe(4499);

    // duplicate → 409
    const dup = await request(app).post('/api/subscriptions').set(auth).send({ url: 'https://www.amazon.in/x/dp/B09XS7JWHH' });
    expect(dup.status).toBe(409);

    // list
    const list = await request(app).get('/api/subscriptions').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].product.id).toBe('hash1234');

    // price history via public products route
    const prices = await request(app).get('/api/products/hash1234/prices');
    expect(prices.status).toBe(200);
    expect(prices.body.data[0].price).toBe(4499);

    // patch alert
    const alert = await request(app).patch('/api/subscriptions/hash1234/alert').set(auth).send({ alertPrice: 3999 });
    expect(alert.status).toBe(200);

    // delete
    const del = await request(app).delete('/api/subscriptions/hash1234').set(auth);
    expect(del.status).toBe(204);

    const afterDelete = await request(app).get('/api/subscriptions').set(auth);
    expect(afterDelete.body.data).toHaveLength(0);
  });

  it('400s on an invalid URL body', async () => {
    const token = await registerAndLogin();
    const res = await request(app).post('/api/subscriptions').set({ Authorization: `Bearer ${token}` }).send({ url: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('404s when deleting a tracker the user does not have', async () => {
    const token = await registerAndLogin();
    const res = await request(app).delete('/api/subscriptions/does-not-exist').set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(404);
  });
});

describe('products route', () => {
  it('lists active products with enriched metrics', async () => {
    const token = await registerAndLogin();
    await request(app).post('/api/subscriptions').set({ Authorization: `Bearer ${token}` }).send({ url: 'https://www.amazon.in/x/dp/B09XS7JWHH' });
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    const p = res.body.data.find((x: { id: string }) => x.id === 'hash1234');
    expect(p.subscriberCount).toBe(1);
    expect(p.currentPrice).toBe(4499);
  });
});
