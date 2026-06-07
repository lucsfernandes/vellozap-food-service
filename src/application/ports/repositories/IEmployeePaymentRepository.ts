import type { EmployeePayment, NewEmployeePayment } from '../../../domain/entities/EmployeePayment.js';
import type { PaymentStatus } from '../../../domain/enums/index.js';

export interface ListPaymentsFilter {
  status?: PaymentStatus;
  from?: string;
  to?: string;
}

export interface IEmployeePaymentRepository {
  listByEmployeeIds(employeeIds: ReadonlyArray<string>, filter?: ListPaymentsFilter): Promise<EmployeePayment[]>;
  findById(id: string): Promise<EmployeePayment | null>;
  create(data: NewEmployeePayment): Promise<EmployeePayment>;
  /** Upsert by (employeeId, periodStart, periodEnd): replaces an existing draft for the same period. */
  upsertForPeriod(data: NewEmployeePayment): Promise<EmployeePayment>;
  markPaid(id: string, paymentDate: Date): Promise<EmployeePayment>;
}
