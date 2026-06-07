import { DataSource, type DataSourceOptions } from 'typeorm';
import { loadEnv } from './env.js';
import { ALL_ENTITIES } from '../database/entities/index.js';
import { ALL_MIGRATIONS } from '../database/migrations/index.js';

/** Builds DataSource options from the validated env. `synchronize`/`migrationsRun` are always false. */
export function buildDataSourceOptions(): DataSourceOptions {
  const env = loadEnv();

  const ssl = env.DATABASE_SSL
    ? // Never disable TLS verification against Supabase. Provide CA via env when needed.
      env.DATABASE_CA_CERT && env.DATABASE_CA_CERT.length > 0
      ? { rejectUnauthorized: true as const, ca: env.DATABASE_CA_CERT }
      : { rejectUnauthorized: true as const }
    : false;

  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    ssl,
    synchronize: false,
    migrationsRun: false,
    logging: env.DB_LOGGING,
    entities: [...ALL_ENTITIES],
    migrations: [...ALL_MIGRATIONS],
    migrationsTableName: 'migrations',
  };
}

/** Singleton DataSource used by the app and the TypeORM CLI/migration scripts. */
export const AppDataSource = new DataSource(buildDataSourceOptions());
