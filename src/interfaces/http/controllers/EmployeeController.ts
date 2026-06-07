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
  QueryParam,
} from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  CreateEmployee,
  DeleteEmployee,
  GetEmployee,
  ListEmployees,
  UpdateEmployee,
} from '../../../application/use-cases/employee/EmployeeUseCases.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../../../application/dtos/schemas.js';

@injectable()
@JsonController('/employees')
export class EmployeeController {
  public constructor(
    private readonly listUc: ListEmployees,
    private readonly getUc: GetEmployee,
    private readonly createUc: CreateEmployee,
    private readonly updateUc: UpdateEmployee,
    private readonly deleteUc: DeleteEmployee,
  ) {}

  @Get('/')
  @Authorized(['owner'])
  public list(@CurrentUser() user: AuthUser, @QueryParam('role') role?: string): Promise<unknown> {
    return this.listUc.execute(user.id, role);
  }

  @Get('/:id')
  @Authorized(['owner'])
  public get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<unknown> {
    return this.getUc.execute(user.id, id);
  }

  @Post('/')
  @Authorized(['owner'])
  public create(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<unknown> {
    const dto = validate(createEmployeeSchema, body);
    return this.createUc.execute(user.id, dto);
  }

  @Patch('/:id')
  @Authorized(['owner'])
  public update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown): Promise<unknown> {
    const dto = validate(updateEmployeeSchema, body);
    return this.updateUc.execute(user.id, id, dto);
  }

  @Delete('/:id')
  @Authorized(['owner'])
  @OnUndefined(204)
  public async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.deleteUc.execute(user.id, id);
  }
}
