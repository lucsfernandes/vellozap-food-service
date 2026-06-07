import 'reflect-metadata';
import { AppDataSource } from '../src/infrastructure/config/data-source.js';

/**
 * Runs or reverts TypeORM migrations programmatically (ESM-friendly, avoids the
 * TypeORM CLI's loader quirks). Usage: `tsx scripts/migrate.ts run|revert`.
 *
 * SAFETY: only run against LOCAL Postgres or a stamped DB. On the production
 * Supabase DB, the baseline must already be stamped (scripts/baseline.ts) so
 * the baseline `up()` is skipped; the human runs schema changes on prod.
 */
async function main(): Promise<void> {
  const action = process.argv[2] ?? 'run';
  await AppDataSource.initialize();
  try {
    if (action === 'revert') {
      await AppDataSource.undoLastMigration();
      // eslint-disable-next-line no-console
      console.log('Reverted last migration.');
    } else {
      const applied = await AppDataSource.runMigrations({ transaction: 'each' });
      // eslint-disable-next-line no-console
      console.log(`Applied ${applied.length} migration(s):`, applied.map((m) => m.name).join(', '));
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
