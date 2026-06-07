import type { Request } from 'express';
import {
  Authorized,
  Body,
  CurrentUser,
  Delete,
  Get,
  HttpCode,
  JsonController,
  OnUndefined,
  Param,
  Patch,
  Post,
  QueryParams,
  Req,
} from 'routing-controllers';
import { inject, injectable } from 'tsyringe';
import {
  CreateProduct,
  DeleteProduct,
  GetProduct,
  ListProducts,
  UpdateProduct,
} from '../../../application/use-cases/product/ProductUseCases.js';
import type { ListProductsFilter } from '../../../application/ports/repositories/IProductRepository.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { createProductSchema, updateProductSchema } from '../../../application/dtos/schemas.js';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../../domain/enums/index.js';
import { ValidationError } from '../../../domain/errors/index.js';
import { assertAllowedImage, uploadSingleFile } from '../upload.js';
import type { IStorageProvider } from '../../../application/ports/IStorageProvider.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

interface ProductQuery {
  available?: string;
  category?: string;
  limit?: string;
}

@injectable()
@JsonController('/products')
export class ProductController {
  public constructor(
    private readonly listUc: ListProducts,
    private readonly getUc: GetProduct,
    private readonly createUc: CreateProduct,
    private readonly updateUc: UpdateProduct,
    private readonly deleteUc: DeleteProduct,
    @inject(TOKENS.StorageProvider) private readonly storage: IStorageProvider,
  ) {}

  @Get('/')
  @Authorized(['owner'])
  public list(@CurrentUser() user: AuthUser, @QueryParams() query: ProductQuery): Promise<unknown> {
    const filter: ListProductsFilter = {};
    if (query.available !== undefined) filter.available = query.available === 'true';
    if (query.category !== undefined && (PRODUCT_CATEGORIES as ReadonlyArray<string>).includes(query.category)) {
      filter.category = query.category as ProductCategory;
    }
    if (query.limit !== undefined) filter.limit = Number(query.limit);
    return this.listUc.execute(user.id, filter);
  }

  @Get('/:id')
  @Authorized(['owner'])
  public get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<unknown> {
    return this.getUc.execute(user.id, id);
  }

  @Post('/')
  @Authorized(['owner'])
  public create(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<unknown> {
    const dto = validate(createProductSchema, body);
    return this.createUc.execute(user.id, dto);
  }

  @Patch('/:id')
  @Authorized(['owner'])
  public update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown): Promise<unknown> {
    const dto = validate(updateProductSchema, body);
    return this.updateUc.execute(user.id, id, dto);
  }

  @Delete('/:id')
  @Authorized(['owner'])
  @OnUndefined(204)
  public async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.deleteUc.execute(user.id, id);
  }

  @Post('/:id/image')
  @Authorized(['owner'])
  @HttpCode(200)
  public async uploadImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<unknown> {
    const file = await uploadSingleFile(req);
    if (!file) {
      throw new ValidationError('No file uploaded');
    }
    assertAllowedImage(file);
    const stored = await this.storage.upload({
      buffer: file.buffer,
      filename: file.filename,
      contentType: file.contentType,
      folder: 'products',
    });
    await this.updateUc.setImageUrl(user.id, id, stored.url);
    return { image_url: stored.url };
  }
}
