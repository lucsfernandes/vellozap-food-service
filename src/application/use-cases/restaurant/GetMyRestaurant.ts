import { injectable } from 'tsyringe';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toRestaurantDTO, type RestaurantDTO } from '../../dtos/mappers.js';

@injectable()
export class GetMyRestaurant {
  public constructor(private readonly context: RestaurantContextResolver) {}

  public async execute(userId: string): Promise<RestaurantDTO> {
    const restaurant = await this.context.requireOwned(userId);
    return toRestaurantDTO(restaurant);
  }
}
