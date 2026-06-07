import { inject, injectable } from 'tsyringe';
import type { IEmployeeRepository } from '../../ports/repositories/IEmployeeRepository.js';
import type {
  IWorkRecordRepository,
  ListWorkRecordsFilter,
} from '../../ports/repositories/IWorkRecordRepository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../domain/errors/index.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toWorkRecordDTO, type WorkRecordDTO } from '../../dtos/mappers.js';
import type { CreateWorkRecordBody } from '../../dtos/schemas.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

/** Resolves an employee and asserts it belongs to the owner's restaurant. */
async function assertEmployeeOwned(
  employees: IEmployeeRepository,
  context: RestaurantContextResolver,
  userId: string,
  employeeId: string,
): Promise<void> {
  const restaurantId = await context.resolveRestaurantId(userId);
  const employee = await employees.findById(employeeId);
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }
  if (employee.restaurantId !== restaurantId) {
    throw new ForbiddenError('You do not own this employee');
  }
}

@injectable()
export class ListWorkRecords {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    @inject(TOKENS.WorkRecordRepository) private readonly records: IWorkRecordRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(
    userId: string,
    employeeId: string,
    filter?: ListWorkRecordsFilter,
  ): Promise<WorkRecordDTO[]> {
    await assertEmployeeOwned(this.employees, this.context, userId, employeeId);
    const rows = await this.records.listByEmployee(employeeId, filter);
    return rows.map(toWorkRecordDTO);
  }
}

@injectable()
export class CreateWorkRecord {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    @inject(TOKENS.WorkRecordRepository) private readonly records: IWorkRecordRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, employeeId: string, body: CreateWorkRecordBody): Promise<WorkRecordDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const employee = await this.employees.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    if (employee.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this employee');
    }
    // Business rule: hourly → hours, daily → days.
    if (employee.paymentType === 'hourly' && body.hours_worked == null) {
      throw new ValidationError('hours_worked is required for hourly employees');
    }
    if (employee.paymentType === 'daily' && body.days_worked == null) {
      throw new ValidationError('days_worked is required for daily employees');
    }
    const created = await this.records.create({
      employeeId,
      workDate: body.work_date,
      hoursWorked: body.hours_worked ?? null,
      daysWorked: body.days_worked ?? null,
    });
    return toWorkRecordDTO(created);
  }
}

@injectable()
export class DeleteWorkRecord {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    @inject(TOKENS.WorkRecordRepository) private readonly records: IWorkRecordRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, employeeId: string, recordId: string): Promise<void> {
    await assertEmployeeOwned(this.employees, this.context, userId, employeeId);
    const record = await this.records.findById(recordId);
    if (!record || record.employeeId !== employeeId) {
      throw new NotFoundError('Work record not found');
    }
    await this.records.delete(recordId);
  }
}
