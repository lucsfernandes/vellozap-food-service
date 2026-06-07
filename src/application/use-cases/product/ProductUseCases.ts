import { inject, injectable } from 'tsyringe';
import type {
  IProductRepository,
  ListProductsFilter,
} from '../../ports/repositories/IProductRepository.js';
import type { ProductPatch } from '../../../domain/entities/Product.js';
import { ForbiddenError, NotFoundError } from '../../../domain/errors/index.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toProductDTO, type ProductDTO } from '../../dtos/mappers.js';
import type { CreateProductBody, UpdateProductBody } from '../../dtos/schemas.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

@injectable()
export class ListProducts {
  public constructor(
    @inject(TOKENS.ProductRepository) private readonly products: IProductRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, filter?: ListProductsFilter): Promise<ProductDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const rows = await this.products.listByRestaurant(restaurantId, filter);
    return rows.map(toProductDTO);
  }
}

@injectable()
export class GetProduct {
  public constructor(
    @inject(TOKENS.ProductRepository) private readonly products: IProductRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, productId: string): Promise<ProductDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const product = await this.products.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this product');
    }
    return toProductDTO(product);
  }
}

@injectable()
export class CreateProduct {
  public constructor(
    @inject(TOKENS.ProductRepository) private readonly products: IProductRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, body: CreateProductBody): Promise<ProductDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const created = await this.products.create({
      restaurantId,
      name: body.name,
      description: body.description ?? null,
      priceCents: body.price,
      imageUrl: body.image_url ?? null,
      isAvailable: body.is_available ?? true,
      stockQuantity: body.stock_quantity ?? null,
      category: body.category ?? null,
      size: body.size ?? null,
    });
    return toProductDTO(created);
  }
}

@injectable()
export class UpdateProduct {
  public constructor(
    @inject(TOKENS.ProductRepository) private readonly products: IProductRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, productId: string, body: UpdateProductBody): Promise<ProductDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const product = await this.products.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this product');
    }
    const patch: ProductPatch = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description ?? null;
    if (body.price !== undefined) patch.priceCents = body.price;
    if (body.image_url !== undefined) patch.imageUrl = body.image_url ?? null;
    if (body.is_available !== undefined) patch.isAvailable = body.is_available;
    if (body.stock_quantity !== undefined) patch.stockQuantity = body.stock_quantity ?? null;
    if (body.category !== undefined) patch.category = body.category ?? null;
    if (body.size !== undefined) patch.size = body.size ?? null;
    const updated = await this.products.update(productId, patch);
    return toProductDTO(updated);
  }

  public async setImageUrl(userId: string, productId: string, imageUrl: string): Promise<ProductDTO> {
    return this.execute(userId, productId, { image_url: imageUrl });
  }
}

@injectable()
export class DeleteProduct {
  public constructor(
    @inject(TOKENS.ProductRepository) private readonly products: IProductRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, productId: string): Promise<void> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const product = await this.products.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    if (product.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this product');
    }
    await this.products.delete(productId);
  }
}
