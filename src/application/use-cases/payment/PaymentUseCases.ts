import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { inject, injectable } from 'tsyringe';
import type { IEmployeeRepository } from '../../ports/repositories/IEmployeeRepository.js';
import type { IWorkRecordRepository } from '../../ports/repositories/IWorkRecordRepository.js';
import type {
  IEmployeePaymentRepository,
  ListPaymentsFilter,
} from '../../ports/repositories/IEmployeePaymentRepository.js';
import type { IClock } from '../../ports/IClock.js';
import { EmployeePaymentCalculator } from '../../../domain/services/EmployeePaymentCalculator.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../domain/errors/index.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toPaymentRecordDTO, type PaymentRecordDTO } from '../../dtos/mappers.js';
import type { CalculatePaymentsBody } from '../../dtos/schemas.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

function resolvePeriod(
  body: CalculatePaymentsBody,
  now: Date,
): { from: string; to: string } {
  if (body.period === 'custom') {
    if (!body.from || !body.to) {
      throw new ValidationError('custom period requires from and to dates');
    }
    return { from: body.from, to: body.to };
  }
  const ref = body.period === 'last_month' ? subMonths(now, 1) : now;
  return {
    from: format(startOfMonth(ref), 'yyyy-MM-dd'),
    to: format(endOfMonth(ref), 'yyyy-MM-dd'),
  };
}

@injectable()
export class CalculateEmployeePayments {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    @inject(TOKENS.WorkRecordRepository) private readonly records: IWorkRecordRepository,
    @inject(TOKENS.EmployeePaymentRepository) private readonly payments: IEmployeePaymentRepository,
    @inject(TOKENS.Clock) private readonly clock: IClock,
    private readonly calculator: EmployeePaymentCalculator,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, body: CalculatePaymentsBody): Promise<PaymentRecordDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const { from, to } = resolvePeriod(body, this.clock.now());

    const employees = await this.employees.listByRestaurant(restaurantId);
    const employeeIds = employees.map((e) => e.id);
    const allRecords = await this.records.listByEmployeeIds(employeeIds, { from, to });
    const recordsByEmployee = new Map<string, typeof allRecords>();
    for (const r of allRecords) {
      const list = recordsByEmployee.get(r.employeeId) ?? [];
      list.push(r);
      recordsByEmployee.set(r.employeeId, list);
    }

    const results: PaymentRecordDTO[] = [];
    for (const employee of employees) {
      if (!employee.paymentType) {
        continue;
      }
      const computed = this.calculator.compute(employee, recordsByEmployee.get(employee.id) ?? []);
      const saved = await this.payments.upsertForPeriod({
        employeeId: employee.id,
        periodStart: from,
        periodEnd: to,
        totalDays: computed.totalDays,
        totalHours: computed.totalHours,
        totalAmountCents: computed.totalAmountCents,
        paymentStatus: 'pending',
      });
      results.push(toPaymentRecordDTO(saved, employee));
    }
    return results;
  }
}

@injectable()
export class ListPayments {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    @inject(TOKENS.EmployeePaymentRepository) private readonly payments: IEmployeePaymentRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, filter?: ListPaymentsFilter): Promise<PaymentRecordDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const employees = await this.employees.listByRestaurant(restaurantId);
    const byId = new Map(employees.map((e) => [e.id, e]));
    const rows = await this.payments.listByEmployeeIds([...byId.keys()], filter);
    return rows.map((p) => toPaymentRecordDTO(p, byId.get(p.employeeId)));
  }
}

@injectable()
export class MarkPaymentPaid {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    @inject(TOKENS.EmployeePaymentRepository) private readonly payments: IEmployeePaymentRepository,
    @inject(TOKENS.Clock) private readonly clock: IClock,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, paymentId: string): Promise<PaymentRecordDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const payment = await this.payments.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    const employee = await this.employees.findById(payment.employeeId);
    if (!employee || employee.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this payment');
    }
    const updated = await this.payments.markPaid(paymentId, this.clock.now());
    return toPaymentRecordDTO(updated, employee);
  }
}
