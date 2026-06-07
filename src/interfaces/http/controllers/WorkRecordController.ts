import {
  Authorized,
  Body,
  CurrentUser,
  Delete,
  Get,
  JsonController,
  OnUndefined,
  Param,
  Post,
  QueryParams,
} from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  CreateWorkRecord,
  DeleteWorkRecord,
  ListWorkRecords,
} from '../../../application/use-cases/work-record/WorkRecordUseCases.js';
import type { ListWorkRecordsFilter } from '../../../application/ports/repositories/IWorkRecordRepository.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { createWorkRecordSchema } from '../../../application/dtos/schemas.js';

interface RangeQuery {
  from?: string;
  to?: string;
}

@injectable()
@JsonController('/employees/:employeeId/work-records')
export class WorkRecordController {
  public constructor(
    private readonly listUc: ListWorkRecords,
    private readonly createUc: CreateWorkRecord,
    private readonly deleteUc: DeleteWorkRecord,
  ) {}

  @Get('/')
  @Authorized(['owner'])
  public list(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @QueryParams() query: RangeQuery,
  ): Promise<unknown> {
    const filter: ListWorkRecordsFilter = {};
    if (query.from !== undefined) filter.from = query.from;
    if (query.to !== undefined) filter.to = query.to;
    return this.listUc.execute(user.id, employeeId, filter);
  }

  @Post('/')
  @Authorized(['owner'])
  public create(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const dto = validate(createWorkRecordSchema, body);
    return this.createUc.execute(user.id, employeeId, dto);
  }

  @Delete('/:recordId')
  @Authorized(['owner'])
  @OnUndefined(204)
  public async remove(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Param('recordId') recordId: string,
  ): Promise<void> {
    await this.deleteUc.execute(user.id, employeeId, recordId);
  }
}
