import { Authorized, CurrentUser, Get, JsonController, Param, Post } from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  CompleteOnboarding,
  GetOnboardingProgress,
  MarkStepComplete,
} from '../../../application/use-cases/onboarding/OnboardingUseCases.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';

@injectable()
@JsonController('/onboarding')
export class OnboardingController {
  public constructor(
    private readonly getProgress: GetOnboardingProgress,
    private readonly markStep: MarkStepComplete,
    private readonly complete: CompleteOnboarding,
  ) {}

  @Get('/progress')
  @Authorized(['owner'])
  public progress(@CurrentUser() user: AuthUser): Promise<unknown> {
    return this.getProgress.execute(user.id);
  }

  @Post('/progress/:stepName/complete')
  @Authorized(['owner'])
  public markComplete(@CurrentUser() user: AuthUser, @Param('stepName') stepName: string): Promise<unknown> {
    return this.markStep.execute(user.id, stepName);
  }

  @Post('/complete')
  @Authorized(['owner'])
  public completeOnboarding(@CurrentUser() user: AuthUser): Promise<unknown> {
    return this.complete.execute(user.id);
  }
}
