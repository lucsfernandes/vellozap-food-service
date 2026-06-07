import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'wa_conversations' })
export class WaConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'text', name: 'customer_name', nullable: true })
  customerName!: string | null;

  @Column({ type: 'text', name: 'customer_phone' })
  customerPhone!: string;

  @Column({ type: 'text', name: 'last_message', nullable: true })
  lastMessage!: string | null;

  @Column({ type: 'timestamptz', name: 'last_message_at', nullable: true })
  lastMessageAt!: Date | null;

  @Column({ type: 'integer', name: 'unread_count', default: 0 })
  unreadCount!: number;

  @Column({ type: 'text', default: 'nova' })
  status!: string;

  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
