import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_accounts' })
@Unique('user_accounts_email_key', ['email'])
export class UserAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text', name: 'password_hash', nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'text', name: 'display_name', nullable: true })
  displayName!: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', name: 'email_verified', default: false })
  emailVerified!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
