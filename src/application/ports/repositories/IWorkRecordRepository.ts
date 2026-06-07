import type { NewWorkRecord, WorkRecord } from '../../../domain/entities/WorkRecord.js';

export interface ListWorkRecordsFilter {
  from?: string;
  to?: string;
}

export interface IWorkRecordRepository {
  listByEmployee(employeeId: string, filter?: ListWorkRecordsFilter): Promise<WorkRecord[]>;
  listByEmployeeIds(employeeIds: ReadonlyArray<string>, filter?: ListWorkRecordsFilter): Promise<WorkRecord[]>;
  findById(id: string): Promise<WorkRecord | null>;
  create(data: NewWorkRecord): Promise<WorkRecord>;
  delete(id: string): Promise<void>;
}
