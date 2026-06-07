import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Promotions module (initial structure; PromotionsManagement is empty today). */
export class AddPromotions1717200005000 implements MigrationInterface {
  public name = 'AddPromotions1717200005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        restaurant_id uuid NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
        name text NOT NULL,
        type text NOT NULL,
        discount numeric NOT NULL DEFAULT 0,
        product_ids jsonb,
        valid_from timestamptz,
        valid_to timestamptz,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS promotions_restaurant_id_idx ON promotions (restaurant_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS promotions`);
  }
}
