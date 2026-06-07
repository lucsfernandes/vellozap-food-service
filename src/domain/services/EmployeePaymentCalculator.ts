import type { Employee } from '../entities/Employee.js';
import type { WorkRecord } from '../entities/WorkRecord.js';

export interface ComputedPayment {
  totalDays: number | null;
  totalHours: number | null;
  totalAmountCents: number;
}

/**
 * Pure domain service computing an employee's payment for a period from their
 * work records and pay configuration:
 *  - `daily`   → sum(daysWorked)  × paymentValueCents
 *  - `hourly`  → sum(hoursWorked) × paymentValueCents
 *  - `monthly` → fixed paymentValueCents (ignores records)
 *
 * Hourly fractional hours produce fractional cents, rounded half-up.
 */
export class EmployeePaymentCalculator {
  public compute(employee: Employee, records: ReadonlyArray<WorkRecord>): ComputedPayment {
    const value = employee.paymentValueCents ?? 0;

    const totalDays = records.reduce((sum, r) => sum + (r.daysWorked ?? 0), 0);
    const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked ?? 0), 0);

    switch (employee.paymentType) {
      case 'daily':
        return {
          totalDays,
          totalHours: null,
          totalAmountCents: Math.round(totalDays * value),
        };
      case 'hourly':
        return {
          totalDays: null,
          totalHours,
          totalAmountCents: Math.round(totalHours * value),
        };
      case 'monthly':
        return {
          totalDays: null,
          totalHours: null,
          totalAmountCents: value,
        };
      default:
        // No payment type configured: report aggregates, zero amount.
        return {
          totalDays: totalDays || null,
          totalHours: totalHours || null,
          totalAmountCents: 0,
        };
    }
  }
}
