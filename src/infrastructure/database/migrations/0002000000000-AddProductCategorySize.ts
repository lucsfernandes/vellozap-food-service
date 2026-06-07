import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive: products.category / products.size (nullable) used by MenuManagement. */
export class AddProductCategorySize1717200002000 implements MigrationInterface {
  public name = 'AddProductCategorySize1717200002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category text`);
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS size text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS size`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS category`);
  }
}
