import type { NewProduct, Product, ProductPatch } from '../../../domain/entities/Product.js';
import type { ProductCategory } from '../../../domain/enums/index.js';

export interface ListProductsFilter {
  available?: boolean;
  category?: ProductCategory;
  limit?: number;
}

export interface IProductRepository {
  listByRestaurant(restaurantId: string, filter?: ListProductsFilter): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findManyByIds(ids: ReadonlyArray<string>): Promise<Product[]>;
  create(data: NewProduct): Promise<Product>;
  update(id: string, patch: ProductPatch): Promise<Product>;
  delete(id: string): Promise<void>;
}
