import { config } from 'dotenv';
config();

export default {
  TELEGRAM_BOT_TOKEN: process.env['TELEGRAM_BOT_TOKEN']!,
  DATABASE_URL: process.env['DATABASE_URL']!,
};
