import { randomUUID } from 'node:crypto';
import type {
  IOrderRepository,
  ListOrdersFilter,
} from '../../../src/application/ports/repositories/IOrderRepository.js';
import type { NewOrder, Order } from '../../../src/domain/entities/Order.js';
import type { NewOrderItem, OrderItem } from '../../../src/domain/entities/OrderItem.js';
import type { OrderStatus } from '../../../src/domain/enums/index.js';
import { NotFoundError } from '../../../src/domain/errors/index.js';

export class InMemoryOrderRepository implements IOrderRepository {
  public readonly orders = new Map<string, Order>();
  public readonly items = new Map<string, OrderItem>();

  public async listByRestaurant(
    restaurantId: string,
    filter?: ListOrdersFilter,
  ): Promise<{ data: Order[]; total: number }> {
    let rows = [...this.orders.values()].filter((o) => o.restaurantId === restaurantId);
    if (filter?.status) rows = rows.filter((o) => o.status === filter.status);
    if (filter?.from) rows = rows.filter((o) => o.createdAt >= filter.from!);
    if (filter?.to) rows = rows.filter((o) => o.createdAt <= filter.to!);
    return { data: rows, total: rows.length };
  }

  public async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  public async findByIdWithItems(id: string): Promise<{ order: Order; items: OrderItem[] } | null> {
    const order = this.orders.get(id);
    if (!order) return null;
    const items = [...this.items.values()].filter((i) => i.orderId === id);
    return { order, items };
  }

  public async createWithItems(
    order: NewOrder,
    items: ReadonlyArray<Omit<NewOrderItem, 'orderId'>>,
  ): Promise<{ order: Order; items: OrderItem[] }> {
    const now = new Date();
    const created: Order = {
      id: randomUUID(),
      restaurantId: order.restaurantId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress ?? null,
      status: order.status ?? 'pending',
      paymentMethod: order.paymentMethod ?? null,
      paymentStatus: order.paymentStatus ?? null,
      totalAmountCents: order.totalAmountCents,
      notes: order.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(created.id, created);
    const savedItems = items.map((it) => {
      const item: OrderItem = {
        id: randomUUID(),
        orderId: created.id,
        productId: it.productId,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
        totalPriceCents: it.totalPriceCents,
        notes: it.notes ?? null,
        createdAt: now,
      };
      this.items.set(item.id, item);
      return item;
    });
    return { order: created, items: savedItems };
  }

  public async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundError('Order not found');
    const updated: Order = { ...order, status, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  public async updateTotal(id: string, totalAmountCents: number): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundError('Order not found');
    const updated: Order = { ...order, totalAmountCents, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }
}
