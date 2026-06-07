import type { PaymentStatus } from '../enums/index.js';

/**
 * Domain model mirroring `employee_payments`. `totalAmountCents` is integer
 * BRL cents. `periodStart`/`periodEnd` are ISO dates (YYYY-MM-DD).
 */
export interface EmployeePayment {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  totalDays: number | null;
  totalHours: number | null;
  totalAmountCents: number;
  paymentStatus: PaymentStatus;
  paymentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewEmployeePayment {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  totalDays?: number | null;
  totalHours?: number | null;
  totalAmountCents: number;
  paymentStatus?: PaymentStatus;
  paymentDate?: Date | null;
}
