import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type { IOperatingHoursRepository } from '../../../application/ports/repositories/IOperatingHoursRepository.js';
import type { OperatingHours, OperatingHoursInput } from '../../../domain/entities/OperatingHours.js';
import { TOKENS } from '../../di/tokens.js';
import { OperatingHoursEntity } from '../entities/OperatingHoursEntity.js';

function toDomain(e: OperatingHoursEntity): OperatingHours {
  return {
    id: e.id,
    restaurantId: e.restaurantId,
    dayOfWeek: e.dayOfWeek,
    isOpen: e.isOpen,
    openTime: e.openTime,
    closeTime: e.closeTime,
    createdAt: e.createdAt,
  };
}

@injectable()
export class TypeOrmOperatingHoursRepository implements IOperatingHoursRepository {
  private readonly repo: Repository<OperatingHoursEntity>;

  public constructor(@inject(TOKENS.DataSource) private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(OperatingHoursEntity);
  }

  public async listByRestaurant(restaurantId: string): Promise<OperatingHours[]> {
    const rows = await this.repo.find({ where: { restaurantId }, order: { dayOfWeek: 'ASC' } });
    return rows.map(toDomain);
  }

  public async replaceAll(
    restaurantId: string,
    rows: ReadonlyArray<OperatingHoursInput>,
  ): Promise<OperatingHours[]> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(OperatingHoursEntity, { restaurantId });
      const entities = rows.map((r) =>
        manager.create(OperatingHoursEntity, {
          restaurantId,
          dayOfWeek: r.dayOfWeek,
          isOpen: r.isOpen,
          openTime: r.openTime ?? null,
          closeTime: r.closeTime ?? null,
        }),
      );
      const saved = entities.length > 0 ? await manager.save(entities) : [];
      return saved.map(toDomain).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
  }
}
