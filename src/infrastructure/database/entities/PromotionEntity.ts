import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { moneyCentsTransformer } from '../transformers.js';

@Entity({ name: 'promotions' })
export class PromotionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  type!: string;

  @Column({ type: 'numeric', transformer: moneyCentsTransformer })
  discount!: number;

  @Column({ type: 'jsonb', name: 'product_ids', nullable: true })
  productIds!: string[] | null;

  @Column({ type: 'timestamptz', name: 'valid_from', nullable: true })
  validFrom!: Date | null;

  @Column({ type: 'timestamptz', name: 'valid_to', nullable: true })
  validTo!: Date | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
