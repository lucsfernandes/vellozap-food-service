import { inject, injectable } from 'tsyringe';
import type {
  IOrderRepository,
  ListOrdersFilter,
} from '../../ports/repositories/IOrderRepository.js';
import type { IClock } from '../../ports/IClock.js';
import { ForbiddenError, NotFoundError } from '../../../domain/errors/index.js';
import { OrderStatusPolicy } from '../../../domain/services/OrderStatusPolicy.js';
import type { OrderStatus } from '../../../domain/enums/index.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import {
  toOrderDTO,
  toOrderDetailedDTO,
  type OrderDTO,
  type OrderDetailedDTO,
} from '../../dtos/mappers.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

@injectable()
export class ListOrders {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(
    userId: string,
    filter?: ListOrdersFilter,
  ): Promise<{ data: OrderDTO[]; total: number }> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const { data, total } = await this.orders.listByRestaurant(restaurantId, filter);
    return { data: data.map(toOrderDTO), total };
  }
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

@injectable()
export class GetOrderStats {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    @inject(TOKENS.Clock) private readonly clock: IClock,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, period: 'hoje' | 'semana' | 'mes'): Promise<OrderStats> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const now = this.clock.now();
    const from = new Date(now);
    if (period === 'hoje') {
      from.setHours(0, 0, 0, 0);
    } else if (period === 'semana') {
      from.setDate(from.getDate() - 7);
    } else {
      from.setMonth(from.getMonth() - 1);
    }
    const { data } = await this.orders.listByRestaurant(restaurantId, { from, pageSize: 10000 });
    const totalOrders = data.length;
    const totalRevenue = data.reduce((sum, o) => sum + o.totalAmountCents, 0);
    const pendingOrders = data.filter((o) => o.status === 'pending').length;
    const deliveredOrders = data.filter((o) => o.status === 'delivered').length;
    return {
      totalOrders,
      totalRevenue,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      pendingOrders,
      deliveredOrders,
    };
  }
}

@injectable()
export class GetOrder {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, orderId: string): Promise<OrderDetailedDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const found = await this.orders.findByIdWithItems(orderId);
    if (!found) {
      throw new NotFoundError('Order not found');
    }
    if (found.order.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this order');
    }
    return toOrderDetailedDTO(found.order, found.items);
  }
}

@injectable()
export class UpdateOrderStatus {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    private readonly policy: OrderStatusPolicy,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, orderId: string, status: OrderStatus): Promise<OrderDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    if (order.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this order');
    }
    this.policy.assertTransition(order.status, status);
    const updated = await this.orders.updateStatus(orderId, status);
    return toOrderDTO(updated);
  }
}
