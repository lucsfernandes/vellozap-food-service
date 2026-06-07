import type { OnboardingProgress } from '../../../domain/entities/OnboardingProgress.js';

export interface IOnboardingRepository {
  listByUser(userId: string): Promise<OnboardingProgress[]>;
  /** Upsert by (userId, stepName). */
  upsertStep(userId: string, stepName: string, completed: boolean, completedAt: Date | null): Promise<OnboardingProgress>;
}
