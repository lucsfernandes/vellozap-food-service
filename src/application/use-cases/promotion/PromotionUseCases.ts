import { inject, injectable } from 'tsyringe';
import type { IPromotionRepository } from '../../ports/repositories/IPromotionRepository.js';
import type { PromotionPatch } from '../../../domain/entities/Promotion.js';
import { ForbiddenError, NotFoundError } from '../../../domain/errors/index.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toPromotionDTO, type PromotionDTO } from '../../dtos/mappers.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

export interface CreatePromotionInput {
  name: string;
  type: string;
  discount?: number | undefined;
  products?: string[] | null | undefined;
  validFrom?: string | null | undefined;
  validTo?: string | null | undefined;
  active?: boolean | undefined;
}

@injectable()
export class ListPromotions {
  public constructor(
    @inject(TOKENS.PromotionRepository) private readonly promotions: IPromotionRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string): Promise<PromotionDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const rows = await this.promotions.listByRestaurant(restaurantId);
    return rows.map(toPromotionDTO);
  }
}

@injectable()
export class CreatePromotion {
  public constructor(
    @inject(TOKENS.PromotionRepository) private readonly promotions: IPromotionRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, input: CreatePromotionInput): Promise<PromotionDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const created = await this.promotions.create({
      restaurantId,
      name: input.name,
      type: input.type,
      discountCents: input.discount ?? 0,
      productIds: input.products ?? null,
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validTo: input.validTo ? new Date(input.validTo) : null,
      active: input.active ?? true,
    });
    return toPromotionDTO(created);
  }
}

@injectable()
export class UpdatePromotion {
  public constructor(
    @inject(TOKENS.PromotionRepository) private readonly promotions: IPromotionRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(
    userId: string,
    promotionId: string,
    input: {
      name?: string | undefined;
      type?: string | undefined;
      discount?: number | undefined;
      products?: string[] | null | undefined;
      validFrom?: string | null | undefined;
      validTo?: string | null | undefined;
      active?: boolean | undefined;
    },
  ): Promise<PromotionDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const promotion = await this.promotions.findById(promotionId);
    if (!promotion) {
      throw new NotFoundError('Promotion not found');
    }
    if (promotion.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this promotion');
    }
    const patch: PromotionPatch = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.type !== undefined) patch.type = input.type;
    if (input.discount !== undefined) patch.discountCents = input.discount;
    if (input.products !== undefined) patch.productIds = input.products ?? null;
    if (input.validFrom !== undefined) patch.validFrom = input.validFrom ? new Date(input.validFrom) : null;
    if (input.validTo !== undefined) patch.validTo = input.validTo ? new Date(input.validTo) : null;
    if (input.active !== undefined) patch.active = input.active;
    const updated = await this.promotions.update(promotionId, patch);
    return toPromotionDTO(updated);
  }
}

@injectable()
export class DeletePromotion {
  public constructor(
    @inject(TOKENS.PromotionRepository) private readonly promotions: IPromotionRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, promotionId: string): Promise<void> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const promotion = await this.promotions.findById(promotionId);
    if (!promotion) {
      throw new NotFoundError('Promotion not found');
    }
    if (promotion.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this promotion');
    }
    await this.promotions.delete(promotionId);
  }
}
