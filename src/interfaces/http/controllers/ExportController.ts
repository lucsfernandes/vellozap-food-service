import type { Response } from 'express';
import { Authorized, Body, CurrentUser, JsonController, Post, Res } from 'routing-controllers';
import { injectable } from 'tsyringe';
import { ExportOrders, ExportPayments } from '../../../application/use-cases/export/ExportUseCases.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { exportOrdersSchema, exportPaymentsSchema } from '../../../application/dtos/schemas.js';

@injectable()
@JsonController('/export')
export class ExportController {
  public constructor(
    private readonly exportOrdersUc: ExportOrders,
    private readonly exportPaymentsUc: ExportPayments,
  ) {}

  @Post('/orders')
  @Authorized(['owner'])
  public async orders(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<Response> {
    const dto = validate(exportOrdersSchema, body);
    const file = await this.exportOrdersUc.execute(user.id, dto);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.content);
  }

  @Post('/payments')
  @Authorized(['owner'])
  public async payments(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<Response> {
    const dto = validate(exportPaymentsSchema, body);
    const file = await this.exportPaymentsUc.execute(user.id, dto);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.content);
  }
}
