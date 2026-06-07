import type { NewOrder, Order } from '../../../domain/entities/Order.js';
import type { OrderItem, NewOrderItem } from '../../../domain/entities/OrderItem.js';
import type { OrderStatus } from '../../../domain/enums/index.js';

export interface ListOrdersFilter {
  status?: OrderStatus;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface IOrderRepository {
  listByRestaurant(restaurantId: string, filter?: ListOrdersFilter): Promise<{ data: Order[]; total: number }>;
  findById(id: string): Promise<Order | null>;
  findByIdWithItems(id: string): Promise<{ order: Order; items: OrderItem[] } | null>;
  /** Creates the order together with its items atomically. */
  createWithItems(order: NewOrder, items: ReadonlyArray<Omit<NewOrderItem, 'orderId'>>): Promise<{ order: Order; items: OrderItem[] }>;
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
  updateTotal(id: string, totalAmountCents: number): Promise<Order>;
}
