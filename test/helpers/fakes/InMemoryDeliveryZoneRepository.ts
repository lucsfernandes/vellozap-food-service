import { randomUUID } from 'node:crypto';
import type { IDeliveryZoneRepository } from '../../../src/application/ports/repositories/IDeliveryZoneRepository.js';
import type { DeliveryZone, DeliveryZoneInput } from '../../../src/domain/entities/DeliveryZone.js';

export class InMemoryDeliveryZoneRepository implements IDeliveryZoneRepository {
  public readonly items = new Map<string, DeliveryZone>();

  public seed(zone: Omit<DeliveryZone, 'id'> & { id?: string }): DeliveryZone {
    const z: DeliveryZone = { ...zone, id: zone.id ?? randomUUID() };
    this.items.set(z.id, z);
    return z;
  }

  public async listByRestaurant(restaurantId: string): Promise<DeliveryZone[]> {
    return [...this.items.values()].filter((z) => z.restaurantId === restaurantId);
  }

  public async replaceAll(restaurantId: string, zones: ReadonlyArray<DeliveryZoneInput>): Promise<DeliveryZone[]> {
    for (const [id, z] of this.items.entries()) {
      if (z.restaurantId === restaurantId) this.items.delete(id);
    }
    return zones.map((z) => this.seed({ restaurantId, ...z }));
  }
}
