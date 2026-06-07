import { Authorized, Body, CurrentUser, Get, JsonController, Post, Put } from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  CalculateDeliveryFee,
  GetDeliveryZones,
  UpsertDeliveryZones,
} from '../../../application/use-cases/delivery/DeliveryUseCases.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { calculateDeliverySchema, deliveryZonesSchema } from '../../../application/dtos/schemas.js';

@injectable()
@JsonController('/delivery')
export class DeliveryController {
  public constructor(
    private readonly getZones: GetDeliveryZones,
    private readonly upsertZones: UpsertDeliveryZones,
    private readonly calculate: CalculateDeliveryFee,
  ) {}

  @Get('/zones')
  @Authorized(['owner'])
  public zones(@CurrentUser() user: AuthUser): Promise<unknown> {
    return this.getZones.execute(user.id);
  }

  @Put('/zones')
  @Authorized(['owner'])
  public replaceZones(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<unknown> {
    const dto = validate(deliveryZonesSchema, body);
    return this.upsertZones.execute(user.id, dto);
  }

  @Post('/calculate')
  @Authorized(['owner'])
  public calc(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<unknown> {
    const dto = validate(calculateDeliverySchema, body);
    return this.calculate.executeForOwner(user.id, dto.customerCep, dto.originCep);
  }
}
