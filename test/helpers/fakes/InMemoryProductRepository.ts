import { randomUUID } from 'node:crypto';
import type {
  IProductRepository,
  ListProductsFilter,
} from '../../../src/application/ports/repositories/IProductRepository.js';
import type { NewProduct, Product, ProductPatch } from '../../../src/domain/entities/Product.js';
import { NotFoundError } from '../../../src/domain/errors/index.js';

export class InMemoryProductRepository implements IProductRepository {
  public readonly items = new Map<string, Product>();

  public seed(partial: Partial<Product> & { restaurantId: string; priceCents: number }): Product {
    const now = new Date();
    const p: Product = {
      id: partial.id ?? randomUUID(),
      restaurantId: partial.restaurantId,
      name: partial.name ?? 'Product',
      description: partial.description ?? null,
      priceCents: partial.priceCents,
      imageUrl: partial.imageUrl ?? null,
      isAvailable: partial.isAvailable ?? true,
      stockQuantity: partial.stockQuantity ?? null,
      category: partial.category ?? null,
      size: partial.size ?? null,
      createdAt: partial.createdAt ?? now,
      updatedAt: partial.updatedAt ?? now,
    };
    this.items.set(p.id, p);
    return p;
  }

  public async listByRestaurant(restaurantId: string, filter?: ListProductsFilter): Promise<Product[]> {
    let rows = [...this.items.values()].filter((p) => p.restaurantId === restaurantId);
    if (filter?.available !== undefined) rows = rows.filter((p) => p.isAvailable === filter.available);
    if (filter?.category !== undefined) rows = rows.filter((p) => p.category === filter.category);
    if (filter?.limit !== undefined) rows = rows.slice(0, filter.limit);
    return rows;
  }

  public async findById(id: string): Promise<Product | null> {
    return this.items.get(id) ?? null;
  }

  public async findManyByIds(ids: ReadonlyArray<string>): Promise<Product[]> {
    return ids.map((id) => this.items.get(id)).filter((p): p is Product => p !== undefined);
  }

  public async create(data: NewProduct): Promise<Product> {
    return this.seed({
      restaurantId: data.restaurantId,
      name: data.name,
      description: data.description ?? null,
      priceCents: data.priceCents,
      imageUrl: data.imageUrl ?? null,
      isAvailable: data.isAvailable ?? true,
      stockQuantity: data.stockQuantity ?? null,
      category: data.category ?? null,
      size: data.size ?? null,
    });
  }

  public async update(id: string, patch: ProductPatch): Promise<Product> {
    const existing = this.items.get(id);
    if (!existing) throw new NotFoundError('Product not found');
    const updated: Product = {
      ...existing,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
      ...(patch.priceCents !== undefined ? { priceCents: patch.priceCents } : {}),
      ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl ?? null } : {}),
      ...(patch.isAvailable !== undefined ? { isAvailable: patch.isAvailable } : {}),
      ...(patch.stockQuantity !== undefined ? { stockQuantity: patch.stockQuantity ?? null } : {}),
      ...(patch.category !== undefined ? { category: patch.category ?? null } : {}),
      ...(patch.size !== undefined ? { size: patch.size ?? null } : {}),
      updatedAt: new Date(),
    };
    this.items.set(id, updated);
    return updated;
  }

  public async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
