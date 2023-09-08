import { config } from 'dotenv';
config();

export default {
  TELEGRAM_BOT_TOKEN: process.env['TELEGRAM_BOT_TOKEN']!,
  TELEGRAM_CHANNEL: process.env['TELEGRAM_CHANNEL']!,
};
