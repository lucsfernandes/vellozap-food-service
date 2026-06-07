import { randomUUID } from 'node:crypto';
import type {
  IWorkRecordRepository,
  ListWorkRecordsFilter,
} from '../../../src/application/ports/repositories/IWorkRecordRepository.js';
import type { NewWorkRecord, WorkRecord } from '../../../src/domain/entities/WorkRecord.js';

export class InMemoryWorkRecordRepository implements IWorkRecordRepository {
  public readonly items = new Map<string, WorkRecord>();

  public seed(partial: Partial<WorkRecord> & { employeeId: string; workDate: string }): WorkRecord {
    const now = new Date();
    const w: WorkRecord = {
      id: partial.id ?? randomUUID(),
      employeeId: partial.employeeId,
      workDate: partial.workDate,
      hoursWorked: partial.hoursWorked ?? null,
      daysWorked: partial.daysWorked ?? null,
      createdAt: partial.createdAt ?? now,
      updatedAt: partial.updatedAt ?? now,
    };
    this.items.set(w.id, w);
    return w;
  }

  private inRange(w: WorkRecord, filter?: ListWorkRecordsFilter): boolean {
    if (filter?.from && w.workDate < filter.from) return false;
    if (filter?.to && w.workDate > filter.to) return false;
    return true;
  }

  public async listByEmployee(employeeId: string, filter?: ListWorkRecordsFilter): Promise<WorkRecord[]> {
    return [...this.items.values()].filter((w) => w.employeeId === employeeId && this.inRange(w, filter));
  }

  public async listByEmployeeIds(
    employeeIds: ReadonlyArray<string>,
    filter?: ListWorkRecordsFilter,
  ): Promise<WorkRecord[]> {
    const set = new Set(employeeIds);
    return [...this.items.values()].filter((w) => set.has(w.employeeId) && this.inRange(w, filter));
  }

  public async findById(id: string): Promise<WorkRecord | null> {
    return this.items.get(id) ?? null;
  }

  public async create(data: NewWorkRecord): Promise<WorkRecord> {
    return this.seed(data);
  }

  public async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
