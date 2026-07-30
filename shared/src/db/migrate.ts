import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import config from '../config';

async function runMigrations(): Promise<void> {
  const pool = new Pool({ connectionString: config.DATABASE_URL });
  const db = drizzle(pool);

  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  console.log(`[migrate] Running migrations from ${migrationsFolder}`);

  await migrate(db, { migrationsFolder });

  console.log('[migrate] All migrations applied successfully.');
  await pool.end();
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate] Migration failed:', err);
    process.exit(1);
  });
