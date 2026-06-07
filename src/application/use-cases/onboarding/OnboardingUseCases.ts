import { inject, injectable } from 'tsyringe';
import type { IOnboardingRepository } from '../../ports/repositories/IOnboardingRepository.js';
import type { IRestaurantRepository } from '../../ports/repositories/IRestaurantRepository.js';
import type { IClock } from '../../ports/IClock.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toOnboardingStepDTO, type OnboardingStepDTO } from '../../dtos/mappers.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

const ONBOARDING_STEPS = [
  'welcome',
  'restaurant_info',
  'products',
  'team',
  'whatsapp',
  'completion',
] as const;

@injectable()
export class GetOnboardingProgress {
  public constructor(
    @inject(TOKENS.OnboardingRepository) private readonly onboarding: IOnboardingRepository,
  ) {}

  public async execute(userId: string): Promise<{ steps: OnboardingStepDTO[] }> {
    const rows = await this.onboarding.listByUser(userId);
    const byName = new Map(rows.map((r) => [r.stepName, r]));
    const steps = ONBOARDING_STEPS.map((name) => {
      const row = byName.get(name);
      return row
        ? toOnboardingStepDTO(row)
        : { step_name: name, completed: false, completed_at: null };
    });
    return { steps };
  }
}

@injectable()
export class MarkStepComplete {
  public constructor(
    @inject(TOKENS.OnboardingRepository) private readonly onboarding: IOnboardingRepository,
    @inject(TOKENS.Clock) private readonly clock: IClock,
  ) {}

  public async execute(userId: string, stepName: string): Promise<OnboardingStepDTO> {
    const row = await this.onboarding.upsertStep(userId, stepName, true, this.clock.now());
    return toOnboardingStepDTO(row);
  }
}

@injectable()
export class CompleteOnboarding {
  public constructor(
    @inject(TOKENS.RestaurantRepository) private readonly restaurants: IRestaurantRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string): Promise<{ onboarding_completed: boolean }> {
    const restaurant = await this.context.requireOwned(userId);
    const updated = await this.restaurants.update(restaurant.id, { onboardingCompleted: true });
    return { onboarding_completed: updated.onboardingCompleted };
  }
}
