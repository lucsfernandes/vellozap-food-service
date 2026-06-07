import type { Response } from 'express';
import {
  Authorized,
  Body,
  CurrentUser,
  Get,
  JsonController,
  Param,
  Post,
  QueryParams,
  Res,
} from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  CalculateEmployeePayments,
  ListPayments,
  MarkPaymentPaid,
} from '../../../application/use-cases/payment/PaymentUseCases.js';
import { ExportPayments } from '../../../application/use-cases/export/ExportUseCases.js';
import type { ListPaymentsFilter } from '../../../application/ports/repositories/IEmployeePaymentRepository.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { calculatePaymentsSchema, exportPaymentsSchema } from '../../../application/dtos/schemas.js';
import { PAYMENT_STATUSES, type PaymentStatus } from '../../../domain/enums/index.js';

interface PaymentQuery {
  status?: string;
  from?: string;
  to?: string;
}

@injectable()
@JsonController('/payments')
export class PaymentController {
  public constructor(
    private readonly calcUc: CalculateEmployeePayments,
    private readonly listUc: ListPayments,
    private readonly payUc: MarkPaymentPaid,
    private readonly exportUc: ExportPayments,
  ) {}

  @Post('/calculate')
  @Authorized(['owner'])
  public calculate(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<unknown> {
    const dto = validate(calculatePaymentsSchema, body);
    return this.calcUc.execute(user.id, dto);
  }

  @Get('/')
  @Authorized(['owner'])
  public list(@CurrentUser() user: AuthUser, @QueryParams() query: PaymentQuery): Promise<unknown> {
    const filter: ListPaymentsFilter = {};
    if (query.status && (PAYMENT_STATUSES as ReadonlyArray<string>).includes(query.status)) {
      filter.status = query.status as PaymentStatus;
    }
    if (query.from) filter.from = query.from;
    if (query.to) filter.to = query.to;
    return this.listUc.execute(user.id, filter);
  }

  @Post('/:id/pay')
  @Authorized(['owner'])
  public pay(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<unknown> {
    return this.payUc.execute(user.id, id);
  }

  @Post('/export')
  @Authorized(['owner'])
  public async exportPayments(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<Response> {
    const dto = validate(exportPaymentsSchema, body);
    const file = await this.exportUc.execute(user.id, dto);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.content);
  }
}
