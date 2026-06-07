import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type { IOrderItemRepository } from '../../../application/ports/repositories/IOrderItemRepository.js';
import type { NewOrderItem, OrderItem } from '../../../domain/entities/OrderItem.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../di/tokens.js';
import { OrderItemEntity } from '../entities/OrderItemEntity.js';

function toDomain(e: OrderItemEntity): OrderItem {
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
export class TypeOrmOrderItemRepository implements IOrderItemRepository {
  private readonly repo: Repository<OrderItemEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(OrderItemEntity);
  }

  public async listByOrder(orderId: string): Promise<OrderItem[]> {
    const rows = await this.repo.find({ where: { orderId }, order: { createdAt: 'ASC' } });
    return rows.map(toDomain);
  }

  public async findById(id: string): Promise<OrderItem | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomain(e) : null;
  }

  public async create(data: NewOrderItem): Promise<OrderItem> {
    const entity = this.repo.create({
      orderId: data.orderId,
      productId: data.productId,
      quantity: data.quantity,
      unitPrice: data.unitPriceCents,
      totalPrice: data.totalPriceCents,
      notes: data.notes ?? null,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async update(
    id: string,
    patch: Partial<Pick<OrderItem, 'quantity' | 'unitPriceCents' | 'totalPriceCents' | 'notes'>>,
  ): Promise<OrderItem> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError('Order item not found');
    }
    if (patch.quantity !== undefined) entity.quantity = patch.quantity;
    if (patch.unitPriceCents !== undefined) entity.unitPrice = patch.unitPriceCents;
    if (patch.totalPriceCents !== undefined) entity.totalPrice = patch.totalPriceCents;
    if (patch.notes !== undefined) entity.notes = patch.notes ?? null;
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
