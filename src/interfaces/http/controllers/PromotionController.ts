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
  CreatePromotion,
  DeletePromotion,
  ListPromotions,
  UpdatePromotion,
} from '../../../application/use-cases/promotion/PromotionUseCases.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { createPromotionSchema, updatePromotionSchema } from '../../../application/dtos/schemas.js';

@injectable()
@JsonController('/promotions')
export class PromotionController {
  public constructor(
    private readonly listUc: ListPromotions,
    private readonly createUc: CreatePromotion,
    private readonly updateUc: UpdatePromotion,
    private readonly deleteUc: DeletePromotion,
  ) {}

  @Get('/')
  @Authorized(['owner'])
  public list(@CurrentUser() user: AuthUser): Promise<unknown> {
    return this.listUc.execute(user.id);
  }

  @Post('/')
  @Authorized(['owner'])
  public create(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<unknown> {
    const dto = validate(createPromotionSchema, body);
    return this.createUc.execute(user.id, dto);
  }

  @Patch('/:id')
  @Authorized(['owner'])
  public update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown): Promise<unknown> {
    const dto = validate(updatePromotionSchema, body);
    return this.updateUc.execute(user.id, id, dto);
  }

  @Delete('/:id')
  @Authorized(['owner'])
  @OnUndefined(204)
  public async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.deleteUc.execute(user.id, id);
  }
}
