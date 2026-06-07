import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Persisted delivery zones (replaces frontend mock in DeliveryZoneManager). */
export class AddDeliveryZones1717200003000 implements MigrationInterface {
  public name = 'AddDeliveryZones1717200003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        restaurant_id uuid NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
        min_distance numeric NOT NULL,
        max_distance numeric NOT NULL,
        price numeric NOT NULL,
        description text NOT NULL DEFAULT ''
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS delivery_zones_restaurant_id_idx ON delivery_zones (restaurant_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS delivery_zones`);
  }
}
