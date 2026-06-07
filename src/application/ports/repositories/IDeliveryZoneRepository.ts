import type { DeliveryZone, DeliveryZoneInput } from '../../../domain/entities/DeliveryZone.js';

export interface IDeliveryZoneRepository {
  listByRestaurant(restaurantId: string): Promise<DeliveryZone[]>;
  /** Replaces the full set of zones for a restaurant. */
  replaceAll(restaurantId: string, zones: ReadonlyArray<DeliveryZoneInput>): Promise<DeliveryZone[]>;
}
