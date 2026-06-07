import type { NewOrderItem, OrderItem } from '../../../domain/entities/OrderItem.js';

export interface IOrderItemRepository {
  listByOrder(orderId: string): Promise<OrderItem[]>;
  findById(id: string): Promise<OrderItem | null>;
  create(data: NewOrderItem): Promise<OrderItem>;
  update(id: string, patch: Partial<Pick<OrderItem, 'quantity' | 'unitPriceCents' | 'totalPriceCents' | 'notes'>>): Promise<OrderItem>;
  delete(id: string): Promise<void>;
}
