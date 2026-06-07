import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'restaurant_profiles' })
export class RestaurantProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'text', name: 'restaurant_name' })
  restaurantName!: string;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'text', name: 'logo_url', nullable: true })
  logoUrl!: string | null;

  @Column({ type: 'text', name: 'responsible_name', nullable: true })
  responsibleName!: string | null;

  @Column({ type: 'text', nullable: true })
  cnpj!: string | null;

  @Column({ type: 'text', nullable: true })
  email!: string | null;

  @Column({ type: 'text', name: 'delivery_type', nullable: true })
  deliveryType!: string | null;

  @Column({ type: 'text', name: 'whatsapp_number', nullable: true })
  whatsappNumber!: string | null;

  @Column({ type: 'text', name: 'delivery_radius', nullable: true })
  deliveryRadius!: string | null;

  @Column({ type: 'boolean', name: 'onboarding_completed', default: false })
  onboardingCompleted!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
