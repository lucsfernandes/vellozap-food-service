import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'operating_hours' })
export class OperatingHoursEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'integer', name: 'day_of_week' })
  dayOfWeek!: number;

  @Column({ type: 'boolean', name: 'is_open', default: true })
  isOpen!: boolean;

  @Column({ type: 'time', name: 'open_time', nullable: true })
  openTime!: string | null;

  @Column({ type: 'time', name: 'close_time', nullable: true })
  closeTime!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
