import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'auth_identities' })
@Unique('auth_identities_provider_subject_key', ['provider', 'providerSubject'])
export class AuthIdentityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'text' })
  provider!: string;

  @Column({ type: 'text', name: 'provider_subject' })
  providerSubject!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
