import axios from 'axios';
import { CustomError } from '@pricedrop/shared/error';

const SCRAPER_URL = process.env['SCRAPER_URL'] ?? 'http://localhost:5001';

export interface ScrapeResult {
  platform: string;
  canonicalId: string;
  productHash: string;
  price: number;
  title: string | null;
  thumbnailUrl: string | null;
  available: boolean;
  category: string | null;
}

/**
 * Fetch product details from the standalone scrapers service over HTTP.
 * This is the ONLY integration point between the API and the scrapers service.
 */
export async function fetchProductDetails(url: string, website?: string): Promise<ScrapeResult> {
  try {
    const { data } = await axios.post<{ data: ScrapeResult }>(
      `${SCRAPER_URL}/scrape`,
      { url, website },
      { timeout: 90_000 },
    );
    return data.data;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const payload = axios.isAxiosError(error) ? (error.response?.data as { name?: string; error?: string } | undefined) : undefined;
    if (status === 422 || payload?.name === 'PlatformNotDetected') {
      throw new CustomError(payload?.error ?? 'Could not detect platform from URL', 'PlatformNotDetected');
    }
    throw new CustomError(payload?.error ?? 'Unable to fetch product details', 'ScrapeFailed', { error });
  }
}
