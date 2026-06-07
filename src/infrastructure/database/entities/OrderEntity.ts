import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { moneyCentsTransformer } from '../transformers.js';

@Entity({ name: 'orders' })
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'text', name: 'customer_name' })
  customerName!: string;

  @Column({ type: 'text', name: 'customer_phone' })
  customerPhone!: string;

  @Column({ type: 'text', name: 'customer_address', nullable: true })
  customerAddress!: string | null;

  @Column({ type: 'text', default: 'pending' })
  status!: string;

  @Column({ type: 'text', name: 'payment_method', nullable: true })
  paymentMethod!: string | null;

  @Column({ type: 'text', name: 'payment_status', nullable: true })
  paymentStatus!: string | null;

  @Column({ type: 'numeric', name: 'total_amount', transformer: moneyCentsTransformer })
  totalAmount!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
