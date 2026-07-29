import { pgTable, text, integer, boolean, timestamp, bigint, uuid, index, unique } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// 1. Abstract identity
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// 2. Telegram provider
// ---------------------------------------------------------------------------
export const telegramUsers = pgTable('telegram_users', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
  username: text('username').notNull().default(''),
});

// ---------------------------------------------------------------------------
// 3. Web provider
// ---------------------------------------------------------------------------
export const webUsers = pgTable('web_users', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// 4. Reddit provider
// ---------------------------------------------------------------------------
export const redditUsers = pgTable('reddit_users', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  redditUsername: text('reddit_username').notNull().unique(),
});

// ---------------------------------------------------------------------------
// 5. Products — one row per unique product URL, shared across subscribers
// ---------------------------------------------------------------------------
export const products = pgTable('products', {
  id: text('id').primaryKey(), // 8-char sha256 hash of {website, canonicalId}
  url: text('url').notNull(),
  website: text('website').notNull(), // 'amazon' | 'flipkart' | 'myntra' ...
  title: text('title'),
  thumbnailUrl: text('thumbnail_url'),
  viewCount: integer('view_count').notNull().default(0),
  scrapeInterval: integer('scrape_interval').notNull().default(300),
  priority: text('priority').notNull().default('tier1'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// 6. Subscriptions — join: user ↔ product
// ---------------------------------------------------------------------------
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  alertPrice: integer('alert_price'),
  notifyEveryChange: boolean('notify_every_change').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('subscriptions_user_idx').on(t.userId),
  index('subscriptions_product_idx').on(t.productId),
]);

// ---------------------------------------------------------------------------
// 7. Prices — append-only price history
// ---------------------------------------------------------------------------
export const prices = pgTable('prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  price: integer('price').notNull(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('prices_product_idx').on(t.productId),
  index('prices_created_at_idx').on(t.productId, t.createdAt),
]);

// ---------------------------------------------------------------------------
// 8. Product metrics — pre-computed price stats per product
// ---------------------------------------------------------------------------
export const productMetrics = pgTable('product_metrics', {
  productId: text('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  initialPrice: integer('initial_price'),
  currentPrice: integer('current_price'),
  allTimeLow: integer('all_time_low'),
  lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }),
  lastPriceChangeAt: timestamp('last_price_change_at', { withTimezone: true }),
  failureCount: integer('failure_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// 9. Lists — user-created product groupings
// ---------------------------------------------------------------------------
export const lists = pgTable('lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('lists_user_idx').on(t.userId),
  unique('lists_user_name_uniq').on(t.userId, t.name),
]);

// ---------------------------------------------------------------------------
// 10. List items — maps a subscription to exactly one list
// ---------------------------------------------------------------------------
export const listItems = pgTable('list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .notNull()
    .references(() => lists.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id')
    .notNull()
    .unique()
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Inferred types — used throughout the app instead of manual interfaces
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type TelegramUser = typeof telegramUsers.$inferSelect;
export type WebUser = typeof webUsers.$inferSelect;
export type RedditUser = typeof redditUsers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Price = typeof prices.$inferSelect;
export type ProductMetrics = typeof productMetrics.$inferSelect;
export type List = typeof lists.$inferSelect;
export type ListItem = typeof listItems.$inferSelect;

// Derived type from the findAllActiveProducts join query
export interface EnrichedProduct extends Product {
  subscriberCount: number;
  rankScore: number;
  initialPrice: number | null;
  currentPrice: number | null;
  allTimeLow: number | null;
  addedBy: string | null;
}
