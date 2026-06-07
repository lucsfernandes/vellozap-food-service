import { inject, injectable } from 'tsyringe';
import type { IOperatingHoursRepository } from '../../ports/repositories/IOperatingHoursRepository.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toOperatingHoursDTO, type OperatingHoursDTO } from '../../dtos/mappers.js';
import type { OperatingHoursBody } from '../../dtos/schemas.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

@injectable()
export class GetOperatingHours {
  public constructor(
    @inject(TOKENS.OperatingHoursRepository) private readonly repo: IOperatingHoursRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string): Promise<OperatingHoursDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const rows = await this.repo.listByRestaurant(restaurantId);
    return rows.map(toOperatingHoursDTO);
  }
}

@injectable()
export class UpsertOperatingHours {
  public constructor(
    @inject(TOKENS.OperatingHoursRepository) private readonly repo: IOperatingHoursRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, body: OperatingHoursBody): Promise<OperatingHoursDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const rows = await this.repo.replaceAll(
      restaurantId,
      body.map((r) => ({
        dayOfWeek: r.day_of_week,
        isOpen: r.is_open,
        openTime: r.open_time ?? null,
        closeTime: r.close_time ?? null,
      })),
    );
    return rows.map(toOperatingHoursDTO);
  }
}
