import { inject, injectable } from 'tsyringe';
import type { IUserAccountRepository } from '../../ports/repositories/IAuthRepositories.js';
import type { IRestaurantRepository } from '../../ports/repositories/IRestaurantRepository.js';
import type { AppRole } from '../../../domain/enums/index.js';
import { UnauthorizedError } from '../../../domain/errors/index.js';
import { toRestaurantDTO, type RestaurantDTO } from '../../dtos/mappers.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

export interface CurrentUserResult {
  user: { id: string; email: string; display_name: string | null };
  restaurant: RestaurantDTO | null;
  role: AppRole;
}

@injectable()
export class GetCurrentUser {
  public constructor(
    @inject(TOKENS.UserAccountRepository) private readonly users: IUserAccountRepository,
    @inject(TOKENS.RestaurantRepository) private readonly restaurants: IRestaurantRepository,
  ) {}

  public async execute(userId: string, role: AppRole): Promise<CurrentUserResult> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    const restaurant = await this.restaurants.findByOwnerUserId(userId);
    return {
      user: { id: user.id, email: user.email, display_name: user.displayName },
      restaurant: restaurant ? toRestaurantDTO(restaurant) : null,
      role,
    };
  }
}
