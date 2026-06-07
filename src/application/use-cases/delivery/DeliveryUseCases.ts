import { inject, injectable } from 'tsyringe';
import type { IDeliveryZoneRepository } from '../../ports/repositories/IDeliveryZoneRepository.js';
import type { IDistanceProvider } from '../../ports/IDistanceProvider.js';
import { DeliveryFeeCalculator } from '../../../domain/services/DeliveryFeeCalculator.js';
import { ValidationError } from '../../../domain/errors/index.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toDeliveryZoneDTO, type DeliveryZoneDTO } from '../../dtos/mappers.js';
import type { DeliveryZonesBody } from '../../dtos/schemas.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

@injectable()
export class GetDeliveryZones {
  public constructor(
    @inject(TOKENS.DeliveryZoneRepository) private readonly zones: IDeliveryZoneRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string): Promise<DeliveryZoneDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const rows = await this.zones.listByRestaurant(restaurantId);
    return rows.map(toDeliveryZoneDTO);
  }
}

@injectable()
export class UpsertDeliveryZones {
  public constructor(
    @inject(TOKENS.DeliveryZoneRepository) private readonly zones: IDeliveryZoneRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, body: DeliveryZonesBody): Promise<DeliveryZoneDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const rows = await this.zones.replaceAll(
      restaurantId,
      body.map((z) => ({
        minDistance: z.minDistance,
        maxDistance: z.maxDistance,
        priceCents: z.price,
        description: z.description ?? '',
      })),
    );
    return rows.map(toDeliveryZoneDTO);
  }
}

export interface DeliveryCalculationResult {
  distance: number;
  zone: DeliveryZoneDTO | null;
  deliveryFee: number;
  canDeliver: boolean;
  message: string;
}

@injectable()
export class CalculateDeliveryFee {
  public constructor(
    @inject(TOKENS.DeliveryZoneRepository) private readonly zones: IDeliveryZoneRepository,
    @inject(TOKENS.DistanceProvider) private readonly distance: IDistanceProvider,
    private readonly calc: DeliveryFeeCalculator,
    private readonly context: RestaurantContextResolver,
  ) {}

  /** Owner-scoped calculation: resolves restaurantId from the token. */
  public async executeForOwner(
    userId: string,
    customerCep: string,
    originCep?: string,
  ): Promise<DeliveryCalculationResult> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const restaurant = await this.context.requireOwned(userId);
    const origin = originCep ?? restaurant.address ?? '';
    return this.run(restaurantId, customerCep, origin);
  }

  /** Public calculation for a specific restaurant. */
  public async executeForRestaurant(
    restaurantId: string,
    customerCep: string,
    originCep: string,
  ): Promise<DeliveryCalculationResult> {
    return this.run(restaurantId, customerCep, originCep);
  }

  private async run(
    restaurantId: string,
    customerCep: string,
    originCep: string,
  ): Promise<DeliveryCalculationResult> {
    if (!customerCep) {
      throw new ValidationError('customerCep is required');
    }
    const zones = await this.zones.listByRestaurant(restaurantId);
    const km = await this.distance.distanceKm(originCep, customerCep);
    const result = this.calc.calculate(km, zones);
    return {
      distance: result.distance,
      zone: result.zone ? toDeliveryZoneDTO(result.zone) : null,
      deliveryFee: result.deliveryFeeCents,
      canDeliver: result.canDeliver,
      message: result.message,
    };
  }
}
