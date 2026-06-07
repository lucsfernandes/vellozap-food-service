import { inject, injectable } from 'tsyringe';
import type { IRestaurantRepository } from '../ports/repositories/IRestaurantRepository.js';
import type { Restaurant } from '../../domain/entities/Restaurant.js';
import { ForbiddenError, NotFoundError } from '../../domain/errors/index.js';
import { TOKENS } from '../../infrastructure/di/tokens.js';

/**
 * Central authorization helper. Resolves the owner's restaurant from the token
 * `userId` and asserts that a given `restaurantId` belongs to that owner.
 * Owner-scoped use cases never trust a client-provided `restaurantId`.
 */
@injectable()
export class RestaurantContextResolver {
  public constructor(
    @inject(TOKENS.RestaurantRepository) private readonly restaurants: IRestaurantRepository,
  ) {}

  /** Returns the restaurant owned by `userId` or throws NotFoundError. */
  public async requireOwned(userId: string): Promise<Restaurant> {
    const restaurant = await this.restaurants.findByOwnerUserId(userId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant profile not found for user');
    }
    return restaurant;
  }

  /** Returns the owner's restaurantId. */
  public async resolveRestaurantId(userId: string): Promise<string> {
    const restaurant = await this.requireOwned(userId);
    return restaurant.id;
  }

  /** Asserts `restaurantId` is owned by `userId`; throws ForbiddenError otherwise. */
  public async assertOwnership(userId: string, restaurantId: string): Promise<void> {
    const ownRestaurantId = await this.resolveRestaurantId(userId);
    if (ownRestaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this resource');
    }
  }
}
