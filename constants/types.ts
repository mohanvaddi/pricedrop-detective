// Types are inferred from the Drizzle schema (src/db/schema.ts).
// Kept here as a re-export for backward compatibility with any code
// still importing from this path.
export type {
  User,
  TelegramUser,
  WebUser,
  RedditUser,
  Product,
  EnrichedProduct,
  Subscription,
  Price,
  ProductMetrics,
  List,
  ListItem,
} from '../src/db/schema';

export type CustomErrorType = {
  error: true;
  message: string;
  name: string;
};

