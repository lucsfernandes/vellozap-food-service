import { inject, injectable } from 'tsyringe';
import type { IRestaurantRepository } from '../../ports/repositories/IRestaurantRepository.js';
import type { RestaurantPatch } from '../../../domain/entities/Restaurant.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toRestaurantDTO, type RestaurantDTO } from '../../dtos/mappers.js';
import type { UpdateRestaurantBody } from '../../dtos/schemas.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

@injectable()
export class UpdateRestaurantProfile {
  public constructor(
    @inject(TOKENS.RestaurantRepository) private readonly restaurants: IRestaurantRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, body: UpdateRestaurantBody): Promise<RestaurantDTO> {
    const restaurant = await this.context.requireOwned(userId);
    const patch: RestaurantPatch = {};
    if (body.restaurant_name !== undefined) patch.restaurantName = body.restaurant_name;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.address !== undefined) patch.address = body.address;
    if (body.logo_url !== undefined) patch.logoUrl = body.logo_url;
    if (body.responsible_name !== undefined) patch.responsibleName = body.responsible_name;
    if (body.cnpj !== undefined) patch.cnpj = body.cnpj;
    if (body.email !== undefined) patch.email = body.email;
    if (body.delivery_type !== undefined) patch.deliveryType = body.delivery_type;
    if (body.whatsapp_number !== undefined) patch.whatsappNumber = body.whatsapp_number;
    if (body.delivery_radius !== undefined) patch.deliveryRadius = body.delivery_radius;
    const updated = await this.restaurants.update(restaurant.id, patch);
    return toRestaurantDTO(updated);
  }

  /** Used by the logo-upload flow to persist the new URL. */
  public async setLogoUrl(userId: string, logoUrl: string): Promise<RestaurantDTO> {
    const restaurant = await this.context.requireOwned(userId);
    const updated = await this.restaurants.update(restaurant.id, { logoUrl });
    return toRestaurantDTO(updated);
  }
}
