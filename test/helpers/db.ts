import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../../src/infrastructure/database/entities/index.js';
import { ALL_MIGRATIONS } from '../../src/infrastructure/database/migrations/index.js';

/**
 * Integration-test DataSource pointing at a LOCAL Postgres (never Supabase).
 * Override via TEST_DATABASE_URL; defaults to the docker-compose container.
 */
export function createTestDataSource(): DataSource {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/vellozap_test';
  return new DataSource({
    type: 'postgres',
    url,
    ssl: false,
    synchronize: false,
    migrationsRun: false,
    logging: false,
    entities: [...ALL_ENTITIES],
    migrations: [...ALL_MIGRATIONS],
    migrationsTableName: 'migrations',
  });
}

/** Initializes the DataSource and runs all migrations (idempotent). */
export async function initTestDb(ds: DataSource): Promise<void> {
  await ds.initialize();
  await ds.runMigrations({ transaction: 'each' });
}

const TABLES = [
  'wa_messages',
  'wa_conversations',
  'order_items',
  'orders',
  'employee_payments',
  'employee_work_records',
  'employees',
  'products',
  'operating_hours',
  'delivery_zones',
  'promotions',
  'onboarding_progress',
  'refresh_tokens',
  'auth_identities',
  'user_accounts',
  'restaurant_profiles',
];

/** Truncates all domain tables (preserves the migrations control table). */
export async function truncateAll(ds: DataSource): Promise<void> {
  await ds.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}
