import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { moneyCentsTransformer, numericTransformer } from '../transformers.js';

@Entity({ name: 'employee_payments' })
export class EmployeePaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'employee_id' })
  employeeId!: string;

  @Column({ type: 'date', name: 'period_start' })
  periodStart!: string;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd!: string;

  @Column({ type: 'numeric', name: 'total_days', nullable: true, transformer: numericTransformer })
  totalDays!: number | null;

  @Column({ type: 'numeric', name: 'total_hours', nullable: true, transformer: numericTransformer })
  totalHours!: number | null;

  @Column({ type: 'numeric', name: 'total_amount', transformer: moneyCentsTransformer })
  totalAmount!: number;

  @Column({ type: 'text', name: 'payment_status', default: 'pending' })
  paymentStatus!: string;

  @Column({ type: 'timestamptz', name: 'payment_date', nullable: true })
  paymentDate!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
