import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type { IPromotionRepository } from '../../../application/ports/repositories/IPromotionRepository.js';
import type { NewPromotion, Promotion, PromotionPatch } from '../../../domain/entities/Promotion.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../di/tokens.js';
import { PromotionEntity } from '../entities/PromotionEntity.js';

function toDomain(e: PromotionEntity): Promotion {
  return {
    id: e.id,
    restaurantId: e.restaurantId,
    name: e.name,
    type: e.type,
    discountCents: e.discount,
    productIds: e.productIds,
    validFrom: e.validFrom,
    validTo: e.validTo,
    active: e.active,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

@injectable()
export class TypeOrmPromotionRepository implements IPromotionRepository {
  private readonly repo: Repository<PromotionEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(PromotionEntity);
  }

  public async listByRestaurant(restaurantId: string): Promise<Promotion[]> {
    const rows = await this.repo.find({ where: { restaurantId }, order: { createdAt: 'DESC' } });
    return rows.map(toDomain);
  }

  public async findById(id: string): Promise<Promotion | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomain(e) : null;
  }

  public async create(data: NewPromotion): Promise<Promotion> {
    const entity = this.repo.create({
      restaurantId: data.restaurantId,
      name: data.name,
      type: data.type,
      discount: data.discountCents,
      productIds: data.productIds ?? null,
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
      active: data.active ?? true,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async update(id: string, patch: PromotionPatch): Promise<Promotion> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError('Promotion not found');
    }
    if (patch.name !== undefined) entity.name = patch.name;
    if (patch.type !== undefined) entity.type = patch.type;
    if (patch.discountCents !== undefined) entity.discount = patch.discountCents;
    if (patch.productIds !== undefined) entity.productIds = patch.productIds ?? null;
    if (patch.validFrom !== undefined) entity.validFrom = patch.validFrom ?? null;
    if (patch.validTo !== undefined) entity.validTo = patch.validTo ?? null;
    if (patch.active !== undefined) entity.active = patch.active;
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
