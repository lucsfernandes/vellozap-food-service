import type { Response } from 'express';
import {
  Authorized,
  Body,
  CurrentUser,
  Get,
  JsonController,
  Param,
  Patch,
  Post,
  QueryParams,
  Res,
} from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  GetOrder,
  GetOrderStats,
  ListOrders,
  UpdateOrderStatus,
} from '../../../application/use-cases/order/OrderQueryUseCases.js';
import { ExportOrders } from '../../../application/use-cases/export/ExportUseCases.js';
import type { ListOrdersFilter } from '../../../application/ports/repositories/IOrderRepository.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { exportOrdersSchema, updateOrderStatusSchema } from '../../../application/dtos/schemas.js';
import { ORDER_STATUSES, type OrderStatus } from '../../../domain/enums/index.js';

interface OrderQuery {
  status?: string;
  from?: string;
  to?: string;
  page?: string;
}

@injectable()
@JsonController('/orders')
export class OrderController {
  public constructor(
    private readonly listUc: ListOrders,
    private readonly statsUc: GetOrderStats,
    private readonly getUc: GetOrder,
    private readonly updateStatusUc: UpdateOrderStatus,
    private readonly exportUc: ExportOrders,
  ) {}

  @Get('/')
  @Authorized(['owner'])
  public list(@CurrentUser() user: AuthUser, @QueryParams() query: OrderQuery): Promise<unknown> {
    const filter: ListOrdersFilter = {};
    if (query.status && (ORDER_STATUSES as ReadonlyArray<string>).includes(query.status)) {
      filter.status = query.status as OrderStatus;
    }
    if (query.from) filter.from = new Date(query.from);
    if (query.to) filter.to = new Date(query.to);
    if (query.page) filter.page = Number(query.page);
    return this.listUc.execute(user.id, filter);
  }

  @Get('/stats')
  @Authorized(['owner'])
  public stats(@CurrentUser() user: AuthUser, @QueryParams() query: { period?: string }): Promise<unknown> {
    const period = query.period === 'semana' || query.period === 'mes' ? query.period : 'hoje';
    return this.statsUc.execute(user.id, period);
  }

  @Get('/:id')
  @Authorized(['owner'])
  public get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<unknown> {
    return this.getUc.execute(user.id, id);
  }

  // Owner-only for now: no employee token is ever minted (SignUp/SignIn/Refresh
  // always issue role 'owner') and UpdateOrderStatus scopes via findByOwnerUserId,
  // which cannot match an employee. Employee auth + token.restaurantId scoping is a
  // future extension (M2).
  @Patch('/:id/status')
  @Authorized(['owner'])
  public updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const dto = validate(updateOrderStatusSchema, body);
    return this.updateStatusUc.execute(user.id, id, dto.status);
  }

  @Post('/export')
  @Authorized(['owner'])
  public async exportOrders(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<Response> {
    const dto = validate(exportOrdersSchema, body);
    const file = await this.exportUc.execute(user.id, dto);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.content);
  }
}
