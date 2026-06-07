import { inject, injectable } from 'tsyringe';
import type { IOrderRepository } from '../../ports/repositories/IOrderRepository.js';
import type { IOrderItemRepository } from '../../ports/repositories/IOrderItemRepository.js';
import type { IProductRepository } from '../../ports/repositories/IProductRepository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../domain/errors/index.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toOrderItemDTO, type OrderItemDTO } from '../../dtos/mappers.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

async function requireOwnedOrder(
  orders: IOrderRepository,
  context: RestaurantContextResolver,
  userId: string,
  orderId: string,
): Promise<string> {
  const restaurantId = await context.resolveRestaurantId(userId);
  const order = await orders.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }
  if (order.restaurantId !== restaurantId) {
    throw new ForbiddenError('You do not own this order');
  }
  return restaurantId;
}

async function recomputeTotal(
  orders: IOrderRepository,
  items: IOrderItemRepository,
  orderId: string,
): Promise<void> {
  const rows = await items.listByOrder(orderId);
  const total = rows.reduce((sum, i) => sum + i.totalPriceCents, 0);
  await orders.updateTotal(orderId, total);
}

@injectable()
export class ListOrderItems {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    @inject(TOKENS.OrderItemRepository) private readonly items: IOrderItemRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, orderId: string): Promise<OrderItemDTO[]> {
    await requireOwnedOrder(this.orders, this.context, userId, orderId);
    const rows = await this.items.listByOrder(orderId);
    return rows.map(toOrderItemDTO);
  }
}

@injectable()
export class AddOrderItem {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    @inject(TOKENS.OrderItemRepository) private readonly items: IOrderItemRepository,
    @inject(TOKENS.ProductRepository) private readonly products: IProductRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(
    userId: string,
    orderId: string,
    input: { product_id: string; quantity: number; notes?: string | undefined },
  ): Promise<OrderItemDTO> {
    const restaurantId = await requireOwnedOrder(this.orders, this.context, userId, orderId);
    const product = await this.products.findById(input.product_id);
    if (!product || product.restaurantId !== restaurantId) {
      throw new ValidationError('Invalid product for this restaurant');
    }
    const created = await this.items.create({
      orderId,
      productId: input.product_id,
      quantity: input.quantity,
      unitPriceCents: product.priceCents,
      totalPriceCents: product.priceCents * input.quantity,
      notes: input.notes ?? null,
    });
    await recomputeTotal(this.orders, this.items, orderId);
    return toOrderItemDTO(created);
  }
}

@injectable()
export class UpdateOrderItem {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    @inject(TOKENS.OrderItemRepository) private readonly items: IOrderItemRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(
    userId: string,
    orderId: string,
    itemId: string,
    patch: { quantity?: number | undefined; notes?: string | null | undefined },
  ): Promise<OrderItemDTO> {
    await requireOwnedOrder(this.orders, this.context, userId, orderId);
    const item = await this.items.findById(itemId);
    if (!item || item.orderId !== orderId) {
      throw new NotFoundError('Order item not found');
    }
    const update: { quantity?: number; totalPriceCents?: number; notes?: string | null } = {};
    if (patch.quantity !== undefined) {
      update.quantity = patch.quantity;
      update.totalPriceCents = item.unitPriceCents * patch.quantity;
    }
    if (patch.notes !== undefined) {
      update.notes = patch.notes;
    }
    const updated = await this.items.update(itemId, update);
    await recomputeTotal(this.orders, this.items, orderId);
    return toOrderItemDTO(updated);
  }
}

@injectable()
export class DeleteOrderItem {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    @inject(TOKENS.OrderItemRepository) private readonly items: IOrderItemRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, orderId: string, itemId: string): Promise<void> {
    await requireOwnedOrder(this.orders, this.context, userId, orderId);
    const item = await this.items.findById(itemId);
    if (!item || item.orderId !== orderId) {
      throw new NotFoundError('Order item not found');
    }
    await this.items.delete(itemId);
    await recomputeTotal(this.orders, this.items, orderId);
  }
}
