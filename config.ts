import { config } from 'dotenv';
config();

export default {
  TELEGRAM_BOT_TOKEN: process.env['TELEGRAM_BOT_TOKEN'] ?? '',
  DATABASE_URL: process.env['DATABASE_URL']!,
  // Reddit bot (optional — bot won't start if these are missing)
  REDDIT_CLIENT_ID: process.env['REDDIT_CLIENT_ID'] ?? '',
  REDDIT_CLIENT_SECRET: process.env['REDDIT_CLIENT_SECRET'] ?? '',
  REDDIT_USERNAME: process.env['REDDIT_USERNAME'] ?? '',
  REDDIT_PASSWORD: process.env['REDDIT_PASSWORD'] ?? '',
  REDDIT_USER_AGENT: process.env['REDDIT_USER_AGENT'] ?? 'pricedrop-detective/1.0',
  // WebUI JWT
  JWT_SECRET: process.env['JWT_SECRET'] ?? '',
};
