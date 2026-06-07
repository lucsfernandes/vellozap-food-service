import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type { IOnboardingRepository } from '../../../application/ports/repositories/IOnboardingRepository.js';
import type { OnboardingProgress } from '../../../domain/entities/OnboardingProgress.js';
import { TOKENS } from '../../di/tokens.js';
import { OnboardingProgressEntity } from '../entities/OnboardingProgressEntity.js';

function toDomain(e: OnboardingProgressEntity): OnboardingProgress {
  return {
    id: e.id,
    userId: e.userId,
    stepName: e.stepName,
    completed: e.completed,
    completedAt: e.completedAt,
    createdAt: e.createdAt,
  };
}

@injectable()
export class TypeOrmOnboardingRepository implements IOnboardingRepository {
  private readonly repo: Repository<OnboardingProgressEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(OnboardingProgressEntity);
  }

  public async listByUser(userId: string): Promise<OnboardingProgress[]> {
    const rows = await this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
    return rows.map(toDomain);
  }

  public async upsertStep(
    userId: string,
    stepName: string,
    completed: boolean,
    completedAt: Date | null,
  ): Promise<OnboardingProgress> {
    const existing = await this.repo.findOne({ where: { userId, stepName } });
    if (existing) {
      existing.completed = completed;
      existing.completedAt = completedAt;
      const saved = await this.repo.save(existing);
      return toDomain(saved);
    }
    const entity = this.repo.create({ userId, stepName, completed, completedAt });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }
}
