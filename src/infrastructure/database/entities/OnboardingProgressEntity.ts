import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'onboarding_progress' })
@Unique('onboarding_progress_user_id_step_name_key', ['userId', 'stepName'])
export class OnboardingProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'text', name: 'step_name' })
  stepName!: string;

  @Column({ type: 'boolean', default: false })
  completed!: boolean;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
