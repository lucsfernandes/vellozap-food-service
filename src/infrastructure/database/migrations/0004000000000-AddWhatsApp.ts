import type { MigrationInterface, QueryRunner } from 'typeorm';

/** WhatsApp inbox persistence (conversations + messages). */
export class AddWhatsApp1717200004000 implements MigrationInterface {
  public name = 'AddWhatsApp1717200004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wa_conversations (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        restaurant_id uuid NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
        customer_name text,
        customer_phone text NOT NULL,
        last_message text,
        last_message_at timestamptz,
        unread_count integer NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'nova',
        order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT wa_conversations_restaurant_phone_key UNIQUE (restaurant_id, customer_phone)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wa_messages (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        conversation_id uuid NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
        external_id text,
        text text NOT NULL,
        is_from_customer boolean NOT NULL,
        status text NOT NULL,
        sent_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT wa_messages_conversation_external_key UNIQUE (conversation_id, external_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS wa_messages_conversation_id_idx ON wa_messages (conversation_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS wa_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS wa_conversations`);
  }
}
