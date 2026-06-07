import type { DataSource, Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type { IRefreshTokenRepository } from '../../../application/ports/repositories/IAuthRepositories.js';
import type {
  NewRefreshTokenRecord,
  RefreshTokenRecord,
} from '../../../domain/entities/auth/RefreshTokenRecord.js';
import { TOKENS } from '../../di/tokens.js';
import { RefreshTokenEntity } from '../entities/RefreshTokenEntity.js';

function toDomain(e: RefreshTokenEntity): RefreshTokenRecord {
  return {
    id: e.id,
    userId: e.userId,
    tokenHash: e.tokenHash,
    expiresAt: e.expiresAt,
    revokedAt: e.revokedAt,
    createdAt: e.createdAt,
    userAgent: e.userAgent,
    ip: e.ip,
  };
}

@injectable()
export class TypeOrmRefreshTokenRepository implements IRefreshTokenRepository {
  private readonly repo: Repository<RefreshTokenEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(RefreshTokenEntity);
  }

  public async create(data: NewRefreshTokenRecord): Promise<RefreshTokenRecord> {
    const entity = this.repo.create({
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      userAgent: data.userAgent ?? null,
      ip: data.ip ?? null,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const e = await this.repo.findOne({ where: { tokenHash } });
    return e ? toDomain(e) : null;
  }

  public async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.repo.update({ id }, { revokedAt });
  }

  public async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    await this.repo.update({ userId, revokedAt: IsNull() }, { revokedAt });
  }
}
