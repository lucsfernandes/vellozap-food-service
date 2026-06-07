import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { moneyCentsTransformer } from '../transformers.js';

@Entity({ name: 'products' })
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'numeric', transformer: moneyCentsTransformer })
  price!: number;

  @Column({ type: 'text', name: 'image_url', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'boolean', name: 'is_available', default: true })
  isAvailable!: boolean;

  @Column({ type: 'integer', name: 'stock_quantity', nullable: true })
  stockQuantity!: number | null;

  // Added via migration 0002-AddProductCategorySize (nullable).
  @Column({ type: 'text', nullable: true })
  category!: string | null;

  @Column({ type: 'text', nullable: true })
  size!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
