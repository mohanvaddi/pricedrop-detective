import { config } from 'dotenv';
config();

export default {
  DATABASE_URL: process.env['DATABASE_URL']!,
};
