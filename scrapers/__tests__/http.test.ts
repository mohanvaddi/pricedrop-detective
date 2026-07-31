jest.mock('../src/scraper', () => {
  const actual = jest.requireActual('../src/scraper');
  return { ...actual, scrape: jest.fn() };
});

import request from 'supertest';
import { scrape } from '../src/scraper';
import { CustomError } from '@pricedrop/shared/error';
import { createHttpApp } from '../src/http';

const mockScrape = scrape as jest.MockedFunction<typeof scrape>;
const app = createHttpApp();

describe('GET /health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'scrapers' });
  });
});

describe('GET /platforms', () => {
  it('lists supported platforms with id/name/fetchMethod', async () => {
    const res = await request(app).get('/platforms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const amazon = res.body.data.find((p: { id: string }) => p.id === 'amazon');
    expect(amazon).toEqual({ id: 'amazon', name: 'Amazon', fetchMethod: 'browser' });
  });
});

describe('POST /scrape', () => {
  it('400 when url is missing or not a string', async () => {
    const res = await request(app).post('/scrape').send({});
    expect(res.status).toBe(400);
    expect(res.body.name).toBe('InvalidRequest');
  });

  it('422 when the platform cannot be detected', async () => {
    const res = await request(app).post('/scrape').send({ url: 'https://unknown-store.example/p/1' });
    expect(res.status).toBe(422);
    expect(res.body.name).toBe('PlatformNotDetected');
  });

  it('200 with enriched data (incl. category) on success', async () => {
    mockScrape.mockResolvedValue({
      currentPrice: 4499,
      title: 'Sony WH-1000XM5 Wireless Headphones',
      thumbnailUrl: 'https://x/i.jpg',
      available: true,
    });
    const res = await request(app).post('/scrape').send({ url: 'https://www.amazon.in/Sony/dp/B09XS7JWHH' });
    expect(res.status).toBe(200);
    expect(res.body.data.platform).toBe('amazon');
    expect(res.body.data.price).toBe(4499);
    expect(res.body.data.canonicalId).toBe('amazon:B09XS7JWHH');
    expect(res.body.data.category).toBe('electronics');
    expect(typeof res.body.data.productHash).toBe('string');
  });

  it('502 when the scraper raises a CustomError', async () => {
    mockScrape.mockRejectedValue(new CustomError('session cookies have expired', 'SessionExpired'));
    const res = await request(app).post('/scrape').send({ url: 'https://www.ajio.com/x/p/1' });
    expect(res.status).toBe(502);
    expect(res.body.name).toBe('SessionExpired');
  });

  it('500 on an unexpected error', async () => {
    mockScrape.mockRejectedValue(new Error('boom'));
    const res = await request(app).post('/scrape').send({ url: 'https://www.amazon.in/Sony/dp/B09XS7JWHH' });
    expect(res.status).toBe(500);
    expect(res.body.name).toBe('ScrapeError');
  });
});
