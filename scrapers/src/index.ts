import cron from 'node-cron';
import '@pricedrop/shared/config';
import { startHttpServer } from './http';
import { runBatch } from './worker';
import { createLogger } from './logger';

const log = createLogger('main');

const HTTP_PORT = Number(process.env['SCRAPER_PORT'] ?? 5001);
const CRON_SCHEDULE = process.env['SCRAPE_CRON'] ?? '* * * * *'; // every minute

let batchRunning = false;

async function safeRunBatch(): Promise<void> {
  if (batchRunning) {
    log.warn('previous batch still running — skipping this tick');
    return;
  }
  batchRunning = true;
  try {
    await runBatch();
  } catch (error) {
    log.error('batch failed', { error });
  } finally {
    batchRunning = false;
  }
}

function main(): void {
  startHttpServer(HTTP_PORT);

  cron.schedule(CRON_SCHEDULE, () => {
    void safeRunBatch();
  });
  log.info(`cron scheduled — "${CRON_SCHEDULE}"`);
}

main();
