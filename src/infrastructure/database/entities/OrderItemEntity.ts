import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { moneyCentsTransformer } from '../transformers.js';

@Entity({ name: 'order_items' })
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @Column({ type: 'integer', default: 1 })
  quantity!: number;

  @Column({ type: 'numeric', name: 'unit_price', transformer: moneyCentsTransformer })
  unitPrice!: number;

  @Column({ type: 'numeric', name: 'total_price', transformer: moneyCentsTransformer })
  totalPrice!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
