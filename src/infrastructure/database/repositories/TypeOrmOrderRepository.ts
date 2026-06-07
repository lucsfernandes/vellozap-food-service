import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type {
  IOrderRepository,
  ListOrdersFilter,
} from '../../../application/ports/repositories/IOrderRepository.js';
import type { NewOrder, Order } from '../../../domain/entities/Order.js';
import type { NewOrderItem, OrderItem } from '../../../domain/entities/OrderItem.js';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../../../domain/enums/index.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../di/tokens.js';
import { OrderEntity } from '../entities/OrderEntity.js';
import { OrderItemEntity } from '../entities/OrderItemEntity.js';

function orderToDomain(e: OrderEntity): Order {
  return {
    id: e.id,
    restaurantId: e.restaurantId,
    customerName: e.customerName,
    customerPhone: e.customerPhone,
    customerAddress: e.customerAddress,
    status: e.status as OrderStatus,
    paymentMethod: e.paymentMethod as PaymentMethod | null,
    paymentStatus: e.paymentStatus as PaymentStatus | null,
    totalAmountCents: e.totalAmount,
    notes: e.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function itemToDomain(e: OrderItemEntity): OrderItem {
  return {
    id: e.id,
    orderId: e.orderId,
    productId: e.productId,
    quantity: e.quantity,
    unitPriceCents: e.unitPrice,
    totalPriceCents: e.totalPrice,
    notes: e.notes,
    createdAt: e.createdAt,
  };
}

@injectable()
export class TypeOrmOrderRepository implements IOrderRepository {
  private readonly repo: Repository<OrderEntity>;
  private readonly itemRepo: Repository<OrderItemEntity>;

  public constructor(@inject(TOKENS.DataSource) private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(OrderEntity);
    this.itemRepo = dataSource.getRepository(OrderItemEntity);
  }

  public async listByRestaurant(
    restaurantId: string,
    filter?: ListOrdersFilter,
  ): Promise<{ data: Order[]; total: number }> {
    const qb = this.repo.createQueryBuilder('o').where('o.restaurant_id = :restaurantId', { restaurantId });
    if (filter?.status !== undefined) {
      qb.andWhere('o.status = :status', { status: filter.status });
    }
    if (filter?.from !== undefined) {
      qb.andWhere('o.created_at >= :from', { from: filter.from });
    }
    if (filter?.to !== undefined) {
      qb.andWhere('o.created_at <= :to', { to: filter.to });
    }
    qb.orderBy('o.created_at', 'DESC');
    const page = filter?.page ?? 1;
    const pageSize = filter?.pageSize ?? 50;
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(orderToDomain), total };
  }

  public async findById(id: string): Promise<Order | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? orderToDomain(e) : null;
  }

  public async findByIdWithItems(id: string): Promise<{ order: Order; items: OrderItem[] } | null> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) {
      return null;
    }
    const items = await this.itemRepo.find({ where: { orderId: id }, order: { createdAt: 'ASC' } });
    return { order: orderToDomain(e), items: items.map(itemToDomain) };
  }

  public async createWithItems(
    order: NewOrder,
    items: ReadonlyArray<Omit<NewOrderItem, 'orderId'>>,
  ): Promise<{ order: Order; items: OrderItem[] }> {
    return this.dataSource.transaction(async (manager) => {
      const orderEntity = manager.create(OrderEntity, {
        restaurantId: order.restaurantId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress ?? null,
        status: order.status ?? 'pending',
        paymentMethod: order.paymentMethod ?? null,
        paymentStatus: order.paymentStatus ?? null,
        totalAmount: order.totalAmountCents,
        notes: order.notes ?? null,
      });
      const savedOrder = await manager.save(orderEntity);

      const itemEntities = items.map((it) =>
        manager.create(OrderItemEntity, {
          orderId: savedOrder.id,
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPriceCents,
          totalPrice: it.totalPriceCents,
          notes: it.notes ?? null,
        }),
      );
      const savedItems = itemEntities.length > 0 ? await manager.save(itemEntities) : [];
      return { order: orderToDomain(savedOrder), items: savedItems.map(itemToDomain) };
    });
  }

  public async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError('Order not found');
    }
    entity.status = status;
    const saved = await this.repo.save(entity);
    return orderToDomain(saved);
  }

  public async updateTotal(id: string, totalAmountCents: number): Promise<Order> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError('Order not found');
    }
    entity.totalAmount = totalAmountCents;
    const saved = await this.repo.save(entity);
    return orderToDomain(saved);
  }
}
