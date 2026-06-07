import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline migration. The 9 original tables already exist in the Supabase DB
 * (created by Lovable + the supabase/migrations). On a fresh LOCAL Postgres we
 * create them so integration tests have a schema to run against. The `up()` is
 * fully idempotent (`IF NOT EXISTS`) so it is safe even where objects exist.
 *
 * On the production Supabase DB this migration must NOT execute its `up()`; it
 * is stamped as already-applied via `scripts/baseline.ts`.
 */
export class Baseline1717200000000 implements MigrationInterface {
  public name = 'Baseline1717200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS restaurant_profiles (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL,
        restaurant_name text NOT NULL,
        phone text,
        address text,
        logo_url text,
        responsible_name text,
        cnpj text,
        email text,
        delivery_type text DEFAULT 'delivery',
        whatsapp_number text,
        delivery_radius text DEFAULT '10km',
        onboarding_completed boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        restaurant_id uuid NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        price numeric NOT NULL,
        image_url text,
        is_available boolean NOT NULL DEFAULT true,
        stock_quantity integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        restaurant_id uuid NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
        customer_name text NOT NULL,
        customer_phone text NOT NULL,
        customer_address text,
        status text NOT NULL DEFAULT 'pending',
        payment_method text,
        payment_status text,
        total_amount numeric NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id),
        quantity integer NOT NULL DEFAULT 1,
        unit_price numeric NOT NULL,
        total_price numeric NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        restaurant_id uuid NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
        name text NOT NULL,
        role text NOT NULL,
        phone text,
        email text,
        payment_type text CHECK (payment_type IN ('daily','hourly','monthly')),
        payment_value numeric(10,2),
        pix_key text,
        bank_name text,
        agency text,
        account text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_work_records (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        work_date date NOT NULL,
        hours_worked numeric(4,2),
        days_worked integer,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_payments (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        period_start date NOT NULL,
        period_end date NOT NULL,
        total_days numeric(5,2),
        total_hours numeric(8,2),
        total_amount numeric(10,2) NOT NULL,
        payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending','paid')),
        payment_date timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS onboarding_progress (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL,
        step_name text NOT NULL,
        completed boolean NOT NULL DEFAULT false,
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, step_name)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS operating_hours (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        restaurant_id uuid NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
        day_of_week integer NOT NULL,
        is_open boolean NOT NULL DEFAULT true,
        open_time time,
        close_time time,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(): Promise<void> {
    // No-op: the baseline reflects pre-existing tables; we never drop them.
  }
}
