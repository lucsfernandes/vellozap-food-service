import { inject, injectable } from 'tsyringe';
import type { IRestaurantRepository } from '../../ports/repositories/IRestaurantRepository.js';
import type { IProductRepository } from '../../ports/repositories/IProductRepository.js';
import type { IOrderRepository } from '../../ports/repositories/IOrderRepository.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { toProductDTO, type ProductDTO } from '../../dtos/mappers.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

export interface PublicMenuResult {
  restaurant: {
    id: string;
    name: string;
    logo_url: string | null;
    delivery_type: string | null;
    whatsapp_number: string | null;
  };
  products: ProductDTO[];
}

@injectable()
export class GetPublicMenu {
  public constructor(
    @inject(TOKENS.RestaurantRepository) private readonly restaurants: IRestaurantRepository,
    @inject(TOKENS.ProductRepository) private readonly products: IProductRepository,
  ) {}

  public async execute(restaurantId: string): Promise<PublicMenuResult> {
    const restaurant = await this.restaurants.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }
    const products = await this.products.listByRestaurant(restaurantId, { available: true });
    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.restaurantName,
        logo_url: restaurant.logoUrl,
        delivery_type: restaurant.deliveryType,
        whatsapp_number: restaurant.whatsappNumber,
      },
      products: products.map(toProductDTO),
    };
  }
}

export interface PublicOrderStatusResult {
  status: string;
  total_amount: number;
  items: { product_id: string; quantity: number; unit_price: number; total_price: number }[];
}

@injectable()
export class GetPublicOrderStatus {
  public constructor(@inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository) {}

  public async execute(orderId: string): Promise<PublicOrderStatusResult> {
    const found = await this.orders.findByIdWithItems(orderId);
    if (!found) {
      throw new NotFoundError('Order not found');
    }
    return {
      status: found.order.status,
      total_amount: found.order.totalAmountCents,
      items: found.items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPriceCents,
        total_price: i.totalPriceCents,
      })),
    };
  }
}
