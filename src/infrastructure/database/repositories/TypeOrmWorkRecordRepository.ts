import type { DataSource, Repository } from 'typeorm';
import { Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type {
  IWorkRecordRepository,
  ListWorkRecordsFilter,
} from '../../../application/ports/repositories/IWorkRecordRepository.js';
import type { NewWorkRecord, WorkRecord } from '../../../domain/entities/WorkRecord.js';
import { TOKENS } from '../../di/tokens.js';
import { EmployeeWorkRecordEntity } from '../entities/EmployeeWorkRecordEntity.js';

function toDomain(e: EmployeeWorkRecordEntity): WorkRecord {
  return {
    id: e.id,
    employeeId: e.employeeId,
    workDate: e.workDate,
    hoursWorked: e.hoursWorked,
    daysWorked: e.daysWorked,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function dateRange(filter?: ListWorkRecordsFilter) {
  if (filter?.from && filter?.to) return Between(filter.from, filter.to);
  if (filter?.from) return MoreThanOrEqual(filter.from);
  if (filter?.to) return LessThanOrEqual(filter.to);
  return undefined;
}

@injectable()
export class TypeOrmWorkRecordRepository implements IWorkRecordRepository {
  private readonly repo: Repository<EmployeeWorkRecordEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(EmployeeWorkRecordEntity);
  }

  public async listByEmployee(employeeId: string, filter?: ListWorkRecordsFilter): Promise<WorkRecord[]> {
    const range = dateRange(filter);
    const rows = await this.repo.find({
      where: range ? { employeeId, workDate: range } : { employeeId },
      order: { workDate: 'ASC' },
    });
    return rows.map(toDomain);
  }

  public async listByEmployeeIds(
    employeeIds: ReadonlyArray<string>,
    filter?: ListWorkRecordsFilter,
  ): Promise<WorkRecord[]> {
    if (employeeIds.length === 0) {
      return [];
    }
    const range = dateRange(filter);
    const rows = await this.repo.find({
      where: range
        ? { employeeId: In([...employeeIds]), workDate: range }
        : { employeeId: In([...employeeIds]) },
      order: { workDate: 'ASC' },
    });
    return rows.map(toDomain);
  }

  public async findById(id: string): Promise<WorkRecord | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomain(e) : null;
  }

  public async create(data: NewWorkRecord): Promise<WorkRecord> {
    const entity = this.repo.create({
      employeeId: data.employeeId,
      workDate: data.workDate,
      hoursWorked: data.hoursWorked ?? null,
      daysWorked: data.daysWorked ?? null,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
