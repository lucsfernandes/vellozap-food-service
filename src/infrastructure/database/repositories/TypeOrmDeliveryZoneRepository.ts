import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type { IDeliveryZoneRepository } from '../../../application/ports/repositories/IDeliveryZoneRepository.js';
import type { DeliveryZone, DeliveryZoneInput } from '../../../domain/entities/DeliveryZone.js';
import { TOKENS } from '../../di/tokens.js';
import { DeliveryZoneEntity } from '../entities/DeliveryZoneEntity.js';

function toDomain(e: DeliveryZoneEntity): DeliveryZone {
  return {
    id: e.id,
    restaurantId: e.restaurantId,
    minDistance: e.minDistance,
    maxDistance: e.maxDistance,
    priceCents: e.price,
    description: e.description,
  };
}

@injectable()
export class TypeOrmDeliveryZoneRepository implements IDeliveryZoneRepository {
  private readonly repo: Repository<DeliveryZoneEntity>;

  public constructor(@inject(TOKENS.DataSource) private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(DeliveryZoneEntity);
  }

  public async listByRestaurant(restaurantId: string): Promise<DeliveryZone[]> {
    const rows = await this.repo.find({ where: { restaurantId }, order: { minDistance: 'ASC' } });
    return rows.map(toDomain);
  }

  public async replaceAll(
    restaurantId: string,
    zones: ReadonlyArray<DeliveryZoneInput>,
  ): Promise<DeliveryZone[]> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(DeliveryZoneEntity, { restaurantId });
      const entities = zones.map((z) =>
        manager.create(DeliveryZoneEntity, {
          restaurantId,
          minDistance: z.minDistance,
          maxDistance: z.maxDistance,
          price: z.priceCents,
          description: z.description,
        }),
      );
      const saved = entities.length > 0 ? await manager.save(entities) : [];
      return saved.map(toDomain).sort((a, b) => a.minDistance - b.minDistance);
    });
  }
}
