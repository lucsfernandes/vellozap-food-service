import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'refresh_tokens' })
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('refresh_tokens_user_id_idx')
  userId!: string;

  @Column({ type: 'text', name: 'token_hash' })
  @Index('refresh_tokens_token_hash_idx')
  tokenHash!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'text', nullable: true })
  ip!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
