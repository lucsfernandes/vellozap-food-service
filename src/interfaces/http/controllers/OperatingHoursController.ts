import { Authorized, Body, CurrentUser, Get, JsonController, Put } from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  GetOperatingHours,
  UpsertOperatingHours,
} from '../../../application/use-cases/operating-hours/OperatingHoursUseCases.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { operatingHoursSchema } from '../../../application/dtos/schemas.js';

@injectable()
@JsonController('/operating-hours')
export class OperatingHoursController {
  public constructor(
    private readonly getHours: GetOperatingHours,
    private readonly upsertHours: UpsertOperatingHours,
  ) {}

  @Get('/')
  @Authorized(['owner'])
  public list(@CurrentUser() user: AuthUser): Promise<unknown> {
    return this.getHours.execute(user.id);
  }

  @Put('/')
  @Authorized(['owner'])
  public replace(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<unknown> {
    const dto = validate(operatingHoursSchema, body);
    return this.upsertHours.execute(user.id, dto);
  }
}
