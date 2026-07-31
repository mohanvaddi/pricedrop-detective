jest.mock('axios');

import axios from 'axios';
import { CustomError } from '@pricedrop/shared/error';
import { fetchProductDetails } from '../src/services/scraperClient';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const SCRAPE_RESULT = {
  platform: 'amazon',
  canonicalId: 'amazon:B09XS7JWHH',
  productHash: 'abc12345',
  price: 4499,
  title: 'Sony WH-1000XM5',
  thumbnailUrl: null,
  available: true,
  category: 'electronics',
};

describe('fetchProductDetails', () => {
  beforeEach(() => {
    // isAxiosError is used inside the catch — keep it truthful.
    (mockedAxios.isAxiosError as unknown as jest.Mock) = jest.fn((e) => !!e?.isAxiosError);
  });

  it('unwraps the nested data payload on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: SCRAPE_RESULT } });
    const result = await fetchProductDetails('https://www.amazon.in/x/dp/B09XS7JWHH');
    expect(result).toEqual(SCRAPE_RESULT);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/scrape'),
      { url: 'https://www.amazon.in/x/dp/B09XS7JWHH', website: undefined },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it('maps a 422 response to a PlatformNotDetected CustomError', async () => {
    mockedAxios.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { name: 'PlatformNotDetected', error: 'no platform' } },
    });
    await expect(fetchProductDetails('https://unknown/p/1')).rejects.toMatchObject({
      name: 'PlatformNotDetected',
    });
  });

  it('maps other errors to a ScrapeFailed CustomError', async () => {
    mockedAxios.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 502, data: { name: 'SessionExpired', error: 'boom' } },
    });
    const err = await fetchProductDetails('https://www.ajio.com/x/p/1').catch((e) => e);
    expect(err).toBeInstanceOf(CustomError);
    expect(err.name).toBe('ScrapeFailed');
  });

  it('maps a non-axios failure to ScrapeFailed', async () => {
    mockedAxios.post.mockRejectedValue(new Error('network down'));
    const err = await fetchProductDetails('https://www.amazon.in/x/dp/B09XS7JWHH').catch((e) => e);
    expect(err).toBeInstanceOf(CustomError);
    expect(err.name).toBe('ScrapeFailed');
  });
});
