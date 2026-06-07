import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'wa_messages' })
@Unique('wa_messages_conversation_external_key', ['conversationId', 'externalId'])
export class WaMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId!: string;

  @Column({ type: 'text', name: 'external_id', nullable: true })
  externalId!: string | null;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'boolean', name: 'is_from_customer' })
  isFromCustomer!: boolean;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
