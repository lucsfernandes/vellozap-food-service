import type { Request } from 'express';
import { Authorized, Body, CurrentUser, Get, JsonController, Patch, Post, Req } from 'routing-controllers';
import { injectable } from 'tsyringe';
import { GetMyRestaurant } from '../../../application/use-cases/restaurant/GetMyRestaurant.js';
import { UpdateRestaurantProfile } from '../../../application/use-cases/restaurant/UpdateRestaurantProfile.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { updateRestaurantSchema } from '../../../application/dtos/schemas.js';
import { ValidationError } from '../../../domain/errors/index.js';
import { assertAllowedImage, uploadSingleFile } from '../upload.js';
import type { IStorageProvider } from '../../../application/ports/IStorageProvider.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';
import { inject } from 'tsyringe';

@injectable()
@JsonController('/restaurant')
export class RestaurantController {
  public constructor(
    private readonly getMine: GetMyRestaurant,
    private readonly updateProfile: UpdateRestaurantProfile,
    @inject(TOKENS.StorageProvider) private readonly storage: IStorageProvider,
  ) {}

  @Get('/me')
  @Authorized(['owner'])
  public me(@CurrentUser() user: AuthUser): Promise<unknown> {
    return this.getMine.execute(user.id);
  }

  @Patch('/me')
  @Authorized(['owner'])
  public update(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<unknown> {
    const dto = validate(updateRestaurantSchema, body);
    return this.updateProfile.execute(user.id, dto);
  }

  @Post('/me/logo')
  @Authorized(['owner'])
  public async uploadLogo(@CurrentUser() user: AuthUser, @Req() req: Request): Promise<unknown> {
    const file = await uploadSingleFile(req);
    if (!file) {
      throw new ValidationError('No file uploaded');
    }
    assertAllowedImage(file);
    const stored = await this.storage.upload({
      buffer: file.buffer,
      filename: file.filename,
      contentType: file.contentType,
      folder: 'logos',
    });
    await this.updateProfile.setLogoUrl(user.id, stored.url);
    return { logo_url: stored.url };
  }
}
