import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { moneyCentsTransformer, numericTransformer } from '../transformers.js';

@Entity({ name: 'delivery_zones' })
export class DeliveryZoneEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'numeric', name: 'min_distance', transformer: numericTransformer })
  minDistance!: number;

  @Column({ type: 'numeric', name: 'max_distance', transformer: numericTransformer })
  maxDistance!: number;

  @Column({ type: 'numeric', transformer: moneyCentsTransformer })
  price!: number;

  @Column({ type: 'text', default: '' })
  description!: string;
}
