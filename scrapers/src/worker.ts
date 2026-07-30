import { findDueProducts, updateLastScraped, updateProductCategory } from '@pricedrop/shared/db/products';
import { findMetrics } from '@pricedrop/shared/db/prices';
import type { Product } from '@pricedrop/shared/db/schema';
import { scrape, type Platform } from './scraper';
import { detectPlatform } from './detect';
import { PriceRecorder } from './price-recorder';
import { ScrapeScheduler } from './scheduler';
import { ProductCategorizer } from './categorizer';
import { createLogger } from './logger';

const log = createLogger('worker');

const recorder = new PriceRecorder();
const scheduler = new ScrapeScheduler();
const categorizer = new ProductCategorizer();

function platformOf(product: Product): Platform | null {
  const platforms: string[] = ['amazon', 'flipkart', 'myntra', 'ajio', 'tatacliq', 'ikea', 'decathlon', 'lenskart', 'meesho', 'nykaafashion', 'croma', 'jiomart', 'blinkit', 'bigbasket'];
  if (product.website && platforms.includes(product.website)) return product.website as Platform;
  return detectPlatform(product.url);
}

async function processProduct(product: Product): Promise<void> {
  const platform = platformOf(product);
  if (!platform) {
    log.warn('unknown platform, skipping', { id: product.id, website: product.website });
    return;
  }

  try {
    const { currentPrice, available } = await scrape(platform, product.url);

    // Backfill category on the fly if the product is uncategorized.
    let category = product.category;
    if (!category) {
      const result = categorizer.categorize({ title: product.title, url: product.url, website: product.website });
      if (result.category) {
        category = result.category;
        await updateProductCategory(product.id, result.category, result.productType);
      }
    }

    const outcome = await recorder.record(product.id, currentPrice, available);
    await updateLastScraped(product.id, false);

    const metrics = await findMetrics(product.id);
    const interval = await scheduler.apply(product.id, category, metrics);

    log.info('processed', { id: product.id, platform, price: currentPrice, available, reason: outcome.reason, changeType: outcome.changeType, interval });
  } catch (error) {
    await updateLastScraped(product.id, true);
    const message = error instanceof Error ? error.message : String(error);
    log.warn('scrape failed', { id: product.id, platform, error: message });
  }
}

/**
 * Runs one batch: selects products that are due for a re-scrape and processes
 * each. Reusable both from the in-process cron and the standalone worker script.
 */
export async function runBatch(): Promise<{ processed: number }> {
  const due = await findDueProducts();
  log.info(`batch start — ${due.length} due product(s)`);

  for (const product of due) {
    await processProduct(product);
  }

  log.info(`batch done — processed ${due.length}`);
  return { processed: due.length };
}

// Standalone entry point: `pnpm scrape:worker` runs a single batch and exits.
if (require.main === module) {
  runBatch()
    .then(({ processed }) => {
      log.info(`worker finished — ${processed} processed`);
      process.exit(0);
    })
    .catch((error) => {
      log.error('worker crashed', { error });
      process.exit(1);
    });
}
