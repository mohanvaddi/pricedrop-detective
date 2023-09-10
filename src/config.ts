import { config } from 'dotenv';
config();

export default {
  TELEGRAM_BOT_TOKEN: process.env['TELEGRAM_BOT_TOKEN']!,
  TELEGRAM_CHANNEL: process.env['TELEGRAM_CHANNEL']!,
  SUPABASE_URL: process.env['SUPABASE_URL']!,
  SUPABASE_KEY: process.env['SUPABASE_KEY']!,
  SUPABASE_ACCESS_TOKEN: process.env['SUPABASE_ACCESS_TOKEN']!,
};
