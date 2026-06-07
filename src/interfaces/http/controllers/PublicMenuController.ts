import { Body, Get, JsonController, Param, Post } from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  GetPublicMenu,
  GetPublicOrderStatus,
} from '../../../application/use-cases/public-menu/PublicMenuUseCases.js';
import { CreateOrder } from '../../../application/use-cases/order/CreateOrder.js';
import { validate } from '../../../application/dtos/validate.js';
import { createOrderSchema } from '../../../application/dtos/schemas.js';

/** Public (unauthenticated) endpoints for the digital menu and checkout. */
@injectable()
@JsonController('/public')
export class PublicMenuController {
  public constructor(
    private readonly getMenu: GetPublicMenu,
    private readonly createOrder: CreateOrder,
    private readonly getStatus: GetPublicOrderStatus,
  ) {}

  @Get('/restaurants/:restaurantId/menu')
  public menu(@Param('restaurantId') restaurantId: string): Promise<unknown> {
    return this.getMenu.execute(restaurantId);
  }

  @Post('/restaurants/:restaurantId/orders')
  public async create(@Param('restaurantId') restaurantId: string, @Body() body: unknown): Promise<unknown> {
    const dto = validate(createOrderSchema, body);
    const order = await this.createOrder.execute(restaurantId, dto);
    return { orderId: order.id, status: order.status, total_amount: order.total_amount };
  }

  @Get('/orders/:orderId/status')
  public status(@Param('orderId') orderId: string): Promise<unknown> {
    return this.getStatus.execute(orderId);
  }
}
