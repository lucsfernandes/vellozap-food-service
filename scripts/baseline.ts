import 'reflect-metadata';
import { AppDataSource } from '../src/infrastructure/config/data-source.js';
import { BASELINE_MIGRATION_NAME } from '../src/infrastructure/database/migrations/index.js';

const BASELINE_TIMESTAMP = 1717200000000;

/**
 * Stamps the baseline migration as already-applied WITHOUT running its `up()`.
 * Idempotent. Safe to run ONCE against the production Supabase DB, where the 9
 * original tables already exist. Creates the `migrations` control table if
 * missing and inserts the baseline row only if not already present.
 *
 * This does NOT run any schema-changing migration. Those (0001+) are applied
 * separately via `npm run migration:run` (LOCAL only here; prod left to human).
 */
async function main(): Promise<void> {
  await AppDataSource.initialize();
  const runner = AppDataSource.createQueryRunner();
  try {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        name VARCHAR NOT NULL
      )
    `);
    const existing: Array<{ name: string }> = await runner.query(
      `SELECT name FROM migrations WHERE name = $1`,
      [BASELINE_MIGRATION_NAME],
    );
    if (existing.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Baseline already stamped. Nothing to do.');
      return;
    }
    await runner.query(`INSERT INTO migrations (timestamp, name) VALUES ($1, $2)`, [
      BASELINE_TIMESTAMP,
      BASELINE_MIGRATION_NAME,
    ]);
    // eslint-disable-next-line no-console
    console.log(`Baseline stamped as applied (${BASELINE_MIGRATION_NAME}).`);
  } finally {
    await runner.release();
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Baseline stamping failed:', error);
  process.exitCode = 1;
});
