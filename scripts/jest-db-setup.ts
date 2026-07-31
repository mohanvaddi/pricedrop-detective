/**
 * Jest globalSetup for the DB integration suite. Fails fast with a helpful
 * message if DATABASE_URL is not set — the suite is meant to be launched via
 * `pnpm test:db` (scripts/test-db.sh), which starts an ephemeral Postgres and
 * exports DATABASE_URL before invoking jest.
 */
export default async function globalSetup(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Run the DB suite via `pnpm test:db` (scripts/test-db.sh), ' +
        'which spins up an ephemeral Postgres and applies migrations first.',
    );
  }
}
