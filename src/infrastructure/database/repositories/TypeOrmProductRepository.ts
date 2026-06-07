import type { DataSource, Repository } from 'typeorm';
import { In } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type {
  IProductRepository,
  ListProductsFilter,
} from '../../../application/ports/repositories/IProductRepository.js';
import type { NewProduct, Product, ProductPatch } from '../../../domain/entities/Product.js';
import type { ProductCategory } from '../../../domain/enums/index.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../di/tokens.js';
import { ProductEntity } from '../entities/ProductEntity.js';

function toDomain(e: ProductEntity): Product {
  return {
    id: e.id,
    restaurantId: e.restaurantId,
    name: e.name,
    description: e.description,
    priceCents: e.price,
    imageUrl: e.imageUrl,
    isAvailable: e.isAvailable,
    stockQuantity: e.stockQuantity,
    category: (e.category as ProductCategory | null) ?? null,
    size: e.size,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

@injectable()
export class TypeOrmProductRepository implements IProductRepository {
  private readonly repo: Repository<ProductEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(ProductEntity);
  }

  public async listByRestaurant(restaurantId: string, filter?: ListProductsFilter): Promise<Product[]> {
    const qb = this.repo.createQueryBuilder('p').where('p.restaurant_id = :restaurantId', { restaurantId });
    if (filter?.available !== undefined) {
      qb.andWhere('p.is_available = :available', { available: filter.available });
    }
    if (filter?.category !== undefined) {
      qb.andWhere('p.category = :category', { category: filter.category });
    }
    qb.orderBy('p.created_at', 'DESC');
    if (filter?.limit !== undefined) {
      qb.limit(filter.limit);
    }
    const rows = await qb.getMany();
    return rows.map(toDomain);
  }

  public async findById(id: string): Promise<Product | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomain(e) : null;
  }

  public async findManyByIds(ids: ReadonlyArray<string>): Promise<Product[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.repo.find({ where: { id: In([...ids]) } });
    return rows.map(toDomain);
  }

  public async create(data: NewProduct): Promise<Product> {
    const entity = this.repo.create({
      restaurantId: data.restaurantId,
      name: data.name,
      description: data.description ?? null,
      price: data.priceCents,
      imageUrl: data.imageUrl ?? null,
      isAvailable: data.isAvailable ?? true,
      stockQuantity: data.stockQuantity ?? null,
      category: data.category ?? null,
      size: data.size ?? null,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async update(id: string, patch: ProductPatch): Promise<Product> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError('Product not found');
    }
    if (patch.name !== undefined) entity.name = patch.name;
    if (patch.description !== undefined) entity.description = patch.description ?? null;
    if (patch.priceCents !== undefined) entity.price = patch.priceCents;
    if (patch.imageUrl !== undefined) entity.imageUrl = patch.imageUrl ?? null;
    if (patch.isAvailable !== undefined) entity.isAvailable = patch.isAvailable;
    if (patch.stockQuantity !== undefined) entity.stockQuantity = patch.stockQuantity ?? null;
    if (patch.category !== undefined) entity.category = patch.category ?? null;
    if (patch.size !== undefined) entity.size = patch.size ?? null;
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
