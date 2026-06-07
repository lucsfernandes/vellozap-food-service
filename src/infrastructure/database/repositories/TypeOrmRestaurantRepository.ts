import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type { IRestaurantRepository } from '../../../application/ports/repositories/IRestaurantRepository.js';
import type { NewRestaurant, Restaurant, RestaurantPatch } from '../../../domain/entities/Restaurant.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../di/tokens.js';
import { RestaurantProfileEntity } from '../entities/RestaurantProfileEntity.js';

function toDomain(e: RestaurantProfileEntity): Restaurant {
  return {
    id: e.id,
    userId: e.userId,
    restaurantName: e.restaurantName,
    phone: e.phone,
    address: e.address,
    logoUrl: e.logoUrl,
    responsibleName: e.responsibleName,
    cnpj: e.cnpj,
    email: e.email,
    deliveryType: e.deliveryType,
    whatsappNumber: e.whatsappNumber,
    deliveryRadius: e.deliveryRadius,
    onboardingCompleted: e.onboardingCompleted,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

@injectable()
export class TypeOrmRestaurantRepository implements IRestaurantRepository {
  private readonly repo: Repository<RestaurantProfileEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(RestaurantProfileEntity);
  }

  public async findByOwnerUserId(userId: string): Promise<Restaurant | null> {
    const e = await this.repo.findOne({ where: { userId } });
    return e ? toDomain(e) : null;
  }

  public async findById(id: string): Promise<Restaurant | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomain(e) : null;
  }

  public async findByWhatsappNumber(digits: string): Promise<Restaurant | null> {
    if (!digits) {
      return null;
    }
    const e = await this.repo
      .createQueryBuilder('r')
      .where("regexp_replace(coalesce(r.whatsapp_number, ''), '[^0-9]', '', 'g') = :digits", { digits })
      .getOne();
    return e ? toDomain(e) : null;
  }

  public async create(data: NewRestaurant): Promise<Restaurant> {
    const entity = this.repo.create({
      userId: data.userId,
      restaurantName: data.restaurantName,
      onboardingCompleted: false,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async update(id: string, patch: RestaurantPatch): Promise<Restaurant> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError('Restaurant not found');
    }
    Object.assign(entity, patch);
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }
}
