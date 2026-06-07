import {
  Authorized,
  Body,
  CurrentUser,
  Delete,
  Get,
  JsonController,
  OnUndefined,
  Param,
  Patch,
  Post,
} from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  AddOrderItem,
  DeleteOrderItem,
  ListOrderItems,
  UpdateOrderItem,
} from '../../../application/use-cases/order/OrderItemUseCases.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { addOrderItemSchema, updateOrderItemSchema } from '../../../application/dtos/schemas.js';

@injectable()
@JsonController('/orders/:orderId/items')
export class OrderItemController {
  public constructor(
    private readonly listUc: ListOrderItems,
    private readonly addUc: AddOrderItem,
    private readonly updateUc: UpdateOrderItem,
    private readonly deleteUc: DeleteOrderItem,
  ) {}

  @Get('/')
  @Authorized(['owner'])
  public list(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string): Promise<unknown> {
    return this.listUc.execute(user.id, orderId);
  }

  @Post('/')
  @Authorized(['owner'])
  public add(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const dto = validate(addOrderItemSchema, body);
    return this.addUc.execute(user.id, orderId, dto);
  }

  @Patch('/:itemId')
  @Authorized(['owner'])
  public update(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const dto = validate(updateOrderItemSchema, body);
    return this.updateUc.execute(user.id, orderId, itemId, dto);
  }

  @Delete('/:itemId')
  @Authorized(['owner'])
  @OnUndefined(204)
  public async remove(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.deleteUc.execute(user.id, orderId, itemId);
  }
}
