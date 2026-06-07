import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { moneyCentsTransformer } from '../transformers.js';

@Entity({ name: 'employees' })
export class EmployeeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  role!: string;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  email!: string | null;

  @Column({ type: 'text', name: 'payment_type', nullable: true })
  paymentType!: string | null;

  @Column({ type: 'numeric', name: 'payment_value', nullable: true, transformer: moneyCentsTransformer })
  paymentValue!: number | null;

  @Column({ type: 'text', name: 'pix_key', nullable: true })
  pixKey!: string | null;

  @Column({ type: 'text', name: 'bank_name', nullable: true })
  bankName!: string | null;

  @Column({ type: 'text', nullable: true })
  agency!: string | null;

  @Column({ type: 'text', nullable: true })
  account!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
