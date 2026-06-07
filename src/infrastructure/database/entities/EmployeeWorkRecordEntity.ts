import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../transformers.js';

@Entity({ name: 'employee_work_records' })
export class EmployeeWorkRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'employee_id' })
  employeeId!: string;

  @Column({ type: 'date', name: 'work_date' })
  workDate!: string;

  @Column({ type: 'numeric', name: 'hours_worked', nullable: true, transformer: numericTransformer })
  hoursWorked!: number | null;

  @Column({ type: 'integer', name: 'days_worked', nullable: true })
  daysWorked!: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
