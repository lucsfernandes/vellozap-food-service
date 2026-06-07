import { randomUUID } from 'node:crypto';
import type {
  IEmployeePaymentRepository,
  ListPaymentsFilter,
} from '../../../src/application/ports/repositories/IEmployeePaymentRepository.js';
import type { EmployeePayment, NewEmployeePayment } from '../../../src/domain/entities/EmployeePayment.js';
import { NotFoundError } from '../../../src/domain/errors/index.js';

export class InMemoryEmployeePaymentRepository implements IEmployeePaymentRepository {
  public readonly items = new Map<string, EmployeePayment>();

  private build(data: NewEmployeePayment): EmployeePayment {
    const now = new Date();
    return {
      id: randomUUID(),
      employeeId: data.employeeId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalDays: data.totalDays ?? null,
      totalHours: data.totalHours ?? null,
      totalAmountCents: data.totalAmountCents,
      paymentStatus: data.paymentStatus ?? 'pending',
      paymentDate: data.paymentDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  public async listByEmployeeIds(
    employeeIds: ReadonlyArray<string>,
    filter?: ListPaymentsFilter,
  ): Promise<EmployeePayment[]> {
    const set = new Set(employeeIds);
    return [...this.items.values()].filter((p) => {
      if (!set.has(p.employeeId)) return false;
      if (filter?.status && p.paymentStatus !== filter.status) return false;
      if (filter?.from && p.periodStart < filter.from) return false;
      if (filter?.to && p.periodEnd > filter.to) return false;
      return true;
    });
  }

  public async findById(id: string): Promise<EmployeePayment | null> {
    return this.items.get(id) ?? null;
  }

  public async create(data: NewEmployeePayment): Promise<EmployeePayment> {
    const p = this.build(data);
    this.items.set(p.id, p);
    return p;
  }

  public async upsertForPeriod(data: NewEmployeePayment): Promise<EmployeePayment> {
    for (const p of this.items.values()) {
      if (p.employeeId === data.employeeId && p.periodStart === data.periodStart && p.periodEnd === data.periodEnd) {
        const updated: EmployeePayment = {
          ...p,
          totalDays: data.totalDays ?? null,
          totalHours: data.totalHours ?? null,
          totalAmountCents: data.totalAmountCents,
          updatedAt: new Date(),
        };
        this.items.set(p.id, updated);
        return updated;
      }
    }
    return this.create(data);
  }

  public async markPaid(id: string, paymentDate: Date): Promise<EmployeePayment> {
    const p = this.items.get(id);
    if (!p) throw new NotFoundError('Payment not found');
    const updated: EmployeePayment = { ...p, paymentStatus: 'paid', paymentDate, updatedAt: new Date() };
    this.items.set(id, updated);
    return updated;
  }
}
