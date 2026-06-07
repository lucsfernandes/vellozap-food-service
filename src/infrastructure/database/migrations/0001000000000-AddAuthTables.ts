import type { MigrationInterface, QueryRunner } from 'typeorm';

/** First real schema change: own-auth tables (replaces Supabase Auth). */
export class AddAuthTables1717200001000 implements MigrationInterface {
  public name = 'AddAuthTables1717200001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        email text NOT NULL,
        password_hash text,
        display_name text,
        is_active boolean NOT NULL DEFAULT true,
        email_verified boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_email_key ON user_accounts (lower(email))`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_identities (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        provider text NOT NULL,
        provider_subject text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT auth_identities_provider_subject_key UNIQUE (provider, provider_subject)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        token_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        user_agent text,
        ip text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS refresh_tokens_token_hash_idx ON refresh_tokens (token_hash)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_identities`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_accounts`);
  }
}
