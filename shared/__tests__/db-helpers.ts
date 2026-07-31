import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';

/** Wipe every table between tests so each spec starts from a clean slate. */
export async function resetDb(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      list_items, lists, notification_queue, prices, product_metrics,
      subscriptions, products, telegram_users, reddit_users, web_users,
      users, scraper_sessions
    RESTART IDENTITY CASCADE
  `);
}

/** Insert a bare user row and return its generated id. */
export async function makeUser(): Promise<string> {
  const rows = await db.execute<{ id: string }>(sql`INSERT INTO users DEFAULT VALUES RETURNING id`);
  return rows.rows[0]!.id;
}

/** Insert a product with sensible defaults; returns its hash id. */
export async function makeProduct(id: string, overrides: Partial<{ url: string; website: string; title: string | null; category: string | null; scrapeInterval: number }> = {}): Promise<string> {
  const { url = `https://x/${id}`, website = 'amazon', title = 'Test Product', category = null, scrapeInterval = 300 } = overrides;
  await db.execute(sql`
    INSERT INTO products (id, url, website, title, category, scrape_interval)
    VALUES (${id}, ${url}, ${website}, ${title}, ${category}, ${scrapeInterval})
  `);
  return id;
}
