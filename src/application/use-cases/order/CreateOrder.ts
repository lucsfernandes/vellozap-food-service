import { inject, injectable } from 'tsyringe';
import type { IOrderRepository } from '../../ports/repositories/IOrderRepository.js';
import type { IProductRepository } from '../../ports/repositories/IProductRepository.js';
import type { IDeliveryZoneRepository } from '../../ports/repositories/IDeliveryZoneRepository.js';
import type { IDistanceProvider } from '../../ports/IDistanceProvider.js';
import { DeliveryFeeCalculator } from '../../../domain/services/DeliveryFeeCalculator.js';
import { NotFoundError, ValidationError } from '../../../domain/errors/index.js';
import { toOrderDetailedDTO, type OrderDetailedDTO } from '../../dtos/mappers.js';
import type { CreateOrderBody } from '../../dtos/schemas.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

/**
 * Creates an order for a public restaurant. Server recalculates unit/total
 * prices from the product catalog (never trusts client prices) and applies a
 * delivery fee from the restaurant's zones when a customer CEP is provided.
 */
@injectable()
export class CreateOrder {
  public constructor(
    @inject(TOKENS.OrderRepository) private readonly orders: IOrderRepository,
    @inject(TOKENS.ProductRepository) private readonly products: IProductRepository,
    @inject(TOKENS.DeliveryZoneRepository) private readonly zones: IDeliveryZoneRepository,
    @inject(TOKENS.DistanceProvider) private readonly distance: IDistanceProvider,
    private readonly deliveryCalc: DeliveryFeeCalculator,
  ) {}

  public async execute(
    restaurantId: string,
    body: CreateOrderBody,
    originCep?: string,
  ): Promise<OrderDetailedDTO> {
    const productIds = body.items.map((i) => i.product_id);
    const products = await this.products.findManyByIds(productIds);
    const byId = new Map(products.map((p) => [p.id, p]));

    let itemsTotalCents = 0;
    const items = body.items.map((item) => {
      const product = byId.get(item.product_id);
      if (!product) {
        throw new NotFoundError(`Product not found: ${item.product_id}`);
      }
      if (product.restaurantId !== restaurantId) {
        throw new ValidationError('Product does not belong to this restaurant');
      }
      if (!product.isAvailable) {
        throw new ValidationError(`Product is unavailable: ${product.name}`);
      }
      const unit = product.priceCents;
      const lineTotal = unit * item.quantity;
      itemsTotalCents += lineTotal;
      return {
        productId: item.product_id,
        quantity: item.quantity,
        unitPriceCents: unit,
        totalPriceCents: lineTotal,
        notes: item.notes ?? null,
      };
    });

    // Optional delivery fee.
    let deliveryFeeCents = 0;
    const customerCep = body.customer.cep;
    if (customerCep && originCep) {
      const zones = await this.zones.listByRestaurant(restaurantId);
      if (zones.length > 0) {
        const km = await this.distance.distanceKm(originCep, customerCep);
        deliveryFeeCents = this.deliveryCalc.calculate(km, zones).deliveryFeeCents;
      }
    }

    const totalAmountCents = itemsTotalCents + deliveryFeeCents;
    const address = this.composeAddress(body);

    const { order, items: savedItems } = await this.orders.createWithItems(
      {
        restaurantId,
        customerName: body.customer.name,
        customerPhone: body.customer.phone,
        customerAddress: address,
        status: 'pending',
        paymentMethod: body.payment_method,
        paymentStatus: 'pending',
        totalAmountCents,
        notes: body.notes ?? null,
      },
      items,
    );

    return toOrderDetailedDTO(order, savedItems);
  }

  private composeAddress(body: CreateOrderBody): string | null {
    const c = body.customer;
    const parts = [c.address, c.number, c.complement, c.neighborhood, c.reference].filter(
      (p): p is string => Boolean(p),
    );
    return parts.length > 0 ? parts.join(', ') : null;
  }
}
