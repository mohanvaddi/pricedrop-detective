jest.mock('@pricedrop/shared/db/products', () => ({
  findProduct: jest.fn(),
  findProductsByUser: jest.fn(),
  findAllActiveProducts: jest.fn(),
  insertProduct: jest.fn(),
}));
jest.mock('@pricedrop/shared/db/subscriptions', () => ({
  findSubscriptionsByUser: jest.fn(),
  findSubscription: jest.fn(),
  insertSubscription: jest.fn(),
  deleteSubscription: jest.fn(),
  setAlertPrice: jest.fn(),
}));
jest.mock('@pricedrop/shared/db/prices', () => ({
  insertPrice: jest.fn(),
  findLatestPrice: jest.fn(),
}));
jest.mock('../src/services/scraperClient', () => ({ fetchProductDetails: jest.fn() }));

import * as ProductDB from '@pricedrop/shared/db/products';
import * as SubscriptionDB from '@pricedrop/shared/db/subscriptions';
import * as PriceDB from '@pricedrop/shared/db/prices';
import { fetchProductDetails } from '../src/services/scraperClient';
import { createTracker, removeTracker, setTrackerAlert, getTracker } from '../src/services/tracker';

const mockFetch = fetchProductDetails as jest.Mock;

const DETAILS = {
  platform: 'amazon',
  canonicalId: 'amazon:B09XS7JWHH',
  productHash: 'hash1234',
  price: 4499,
  title: 'Sony WH-1000XM5',
  thumbnailUrl: 'https://x/i.jpg',
  available: true,
  category: 'electronics',
};

const body = { url: 'https://www.amazon.in/x/dp/B09XS7JWHH' };

beforeEach(() => {
  mockFetch.mockResolvedValue(DETAILS);
});

describe('createTracker', () => {
  it('throws TrackerLimitReached at the subscription cap', async () => {
    (SubscriptionDB.findSubscriptionsByUser as jest.Mock).mockResolvedValue(new Array(20).fill({}));
    await expect(createTracker('u1', body)).rejects.toMatchObject({ name: 'TrackerLimitReached' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('creates a new product, price and subscription for a first-time product', async () => {
    (SubscriptionDB.findSubscriptionsByUser as jest.Mock).mockResolvedValue([]);
    (ProductDB.findProduct as jest.Mock).mockResolvedValue(null);

    const res = await createTracker('u1', body);

    expect(res).toEqual({ hash: 'hash1234', currentPrice: 4499 });
    expect(ProductDB.insertProduct).toHaveBeenCalledWith('hash1234', body.url, 'amazon', DETAILS.title, DETAILS.thumbnailUrl, 'electronics');
    expect(PriceDB.insertPrice).toHaveBeenCalledWith('hash1234', 4499, true);
    expect(SubscriptionDB.insertSubscription).toHaveBeenCalled();
  });

  it('subscribes without re-inserting when the product exists but the user is not subscribed', async () => {
    (SubscriptionDB.findSubscriptionsByUser as jest.Mock).mockResolvedValue([]);
    (ProductDB.findProduct as jest.Mock).mockResolvedValue({ id: 'hash1234' });
    (SubscriptionDB.findSubscription as jest.Mock).mockResolvedValue(null);
    (PriceDB.findLatestPrice as jest.Mock).mockResolvedValue({ price: 4200 });

    const res = await createTracker('u1', body);

    expect(res).toEqual({ hash: 'hash1234', currentPrice: 4200 });
    expect(ProductDB.insertProduct).not.toHaveBeenCalled();
    expect(SubscriptionDB.insertSubscription).toHaveBeenCalled();
  });

  it('throws TrackerExists when the user is already subscribed', async () => {
    (SubscriptionDB.findSubscriptionsByUser as jest.Mock).mockResolvedValue([]);
    (ProductDB.findProduct as jest.Mock).mockResolvedValue({ id: 'hash1234' });
    (SubscriptionDB.findSubscription as jest.Mock).mockResolvedValue({ id: 'sub1' });

    await expect(createTracker('u1', body)).rejects.toMatchObject({ name: 'TrackerExists' });
  });
});

describe('removeTracker', () => {
  it('deletes an existing subscription', async () => {
    (SubscriptionDB.findSubscription as jest.Mock).mockResolvedValue({ id: 'sub1' });
    await removeTracker('hash1234', 'u1');
    expect(SubscriptionDB.deleteSubscription).toHaveBeenCalledWith('u1', 'hash1234');
  });

  it('throws TrackerNotFound when there is no subscription', async () => {
    (SubscriptionDB.findSubscription as jest.Mock).mockResolvedValue(null);
    await expect(removeTracker('hash1234', 'u1')).rejects.toMatchObject({ name: 'TrackerNotFound' });
  });
});

describe('setTrackerAlert', () => {
  it('updates the alert price for an existing subscription', async () => {
    (SubscriptionDB.findSubscription as jest.Mock).mockResolvedValue({ id: 'sub1' });
    await setTrackerAlert('hash1234', 'u1', 3999, true);
    expect(SubscriptionDB.setAlertPrice).toHaveBeenCalledWith('u1', 'hash1234', 3999, true);
  });

  it('throws TrackerNotFound when there is no subscription', async () => {
    (SubscriptionDB.findSubscription as jest.Mock).mockResolvedValue(null);
    await expect(setTrackerAlert('hash1234', 'u1', 3999)).rejects.toMatchObject({ name: 'TrackerNotFound' });
  });
});

describe('getTracker', () => {
  it('throws TrackerNotFound when the product is missing', async () => {
    (ProductDB.findProduct as jest.Mock).mockResolvedValue(null);
    await expect(getTracker('hash1234', 'u1')).rejects.toMatchObject({ name: 'TrackerNotFound' });
  });

  it('throws TrackerNotFound when the user is not subscribed', async () => {
    (ProductDB.findProduct as jest.Mock).mockResolvedValue({ id: 'hash1234' });
    (SubscriptionDB.findSubscription as jest.Mock).mockResolvedValue(null);
    await expect(getTracker('hash1234', 'u1')).rejects.toMatchObject({ name: 'TrackerNotFound' });
  });

  it('returns product + subscription when both exist', async () => {
    (ProductDB.findProduct as jest.Mock).mockResolvedValue({ id: 'hash1234' });
    (SubscriptionDB.findSubscription as jest.Mock).mockResolvedValue({ id: 'sub1' });
    const res = await getTracker('hash1234', 'u1');
    expect(res).toEqual({ product: { id: 'hash1234' }, subscription: { id: 'sub1' } });
  });
});
