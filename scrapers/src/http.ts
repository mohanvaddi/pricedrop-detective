import express, { type Request, type Response } from 'express';
import bodyParser from 'body-parser';
import { detectPlatform } from './detect';
import { canonicalizeUrl, scrape, type Platform } from './scraper';
import { caluculateHash } from '@pricedrop/shared/hash';
import { CustomError } from '@pricedrop/shared/error';
import { ProductCategorizer } from './categorizer';
import { listPlatforms } from './platforms';
import { createLogger } from './logger';

const log = createLogger('http');
const categorizer = new ProductCategorizer();

function resolvePlatform(url: string, website?: string): Platform | null {
  if (website) {
    const fromUrl = detectPlatform(url);
    // Trust an explicit website only if it matches a known platform key.
    const platforms = listPlatforms().map((p) => p.id);
    if (platforms.includes(website)) return website as Platform;
    if (fromUrl) return fromUrl;
    return null;
  }
  return detectPlatform(url);
}

export function createHttpApp() {
  const app = express();
  app.use(bodyParser.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'scrapers' });
  });

  app.get('/platforms', (_req: Request, res: Response) => {
    res.json({ data: listPlatforms() });
  });

  app.post('/scrape', async (req: Request, res: Response): Promise<void> => {
    const { url, website } = (req.body ?? {}) as { url?: string; website?: string };

    if (!url || typeof url !== 'string') {
      res.status(400).json({ name: 'InvalidRequest', error: 'A "url" string is required.' });
      return;
    }

    const platform = resolvePlatform(url, website);
    if (!platform) {
      res.status(422).json({ name: 'PlatformNotDetected', error: 'Could not detect a supported platform from the URL.' });
      return;
    }

    try {
      const canonicalId = canonicalizeUrl(platform, url);
      const productHash = caluculateHash(JSON.stringify({ website: platform, canonicalId }));

      const { currentPrice, title, thumbnailUrl, available } = await scrape(platform, url);
      const { category } = categorizer.categorize({ title, url, website: platform });

      log.info('scraped', { platform, productHash, price: currentPrice, available });

      res.json({
        data: {
          platform,
          canonicalId,
          productHash,
          price: currentPrice,
          title,
          thumbnailUrl,
          available,
          category,
        },
      });
    } catch (error) {
      if (error instanceof CustomError) {
        log.warn('scrape failed', { platform, name: error.name, message: error.message });
        res.status(502).json({ name: error.name, error: error.message });
        return;
      }
      log.error('scrape error', { platform, error });
      res.status(500).json({ name: 'ScrapeError', error: 'Unexpected error while scraping.' });
    }
  });

  return app;
}

export function startHttpServer(port: number): void {
  const app = createHttpApp();
  app.listen(port, () => log.info(`scrapers HTTP listening on :${port}`));
}
