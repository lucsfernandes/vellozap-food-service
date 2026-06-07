import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type {
  IEmployeePaymentRepository,
  ListPaymentsFilter,
} from '../../../application/ports/repositories/IEmployeePaymentRepository.js';
import type { EmployeePayment, NewEmployeePayment } from '../../../domain/entities/EmployeePayment.js';
import type { PaymentStatus } from '../../../domain/enums/index.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../di/tokens.js';
import { EmployeePaymentEntity } from '../entities/EmployeePaymentEntity.js';

function toDomain(e: EmployeePaymentEntity): EmployeePayment {
  return {
    id: e.id,
    employeeId: e.employeeId,
    periodStart: e.periodStart,
    periodEnd: e.periodEnd,
    totalDays: e.totalDays,
    totalHours: e.totalHours,
    totalAmountCents: e.totalAmount,
    paymentStatus: e.paymentStatus as PaymentStatus,
    paymentDate: e.paymentDate,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

@injectable()
export class TypeOrmEmployeePaymentRepository implements IEmployeePaymentRepository {
  private readonly repo: Repository<EmployeePaymentEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(EmployeePaymentEntity);
  }

  public async listByEmployeeIds(
    employeeIds: ReadonlyArray<string>,
    filter?: ListPaymentsFilter,
  ): Promise<EmployeePayment[]> {
    if (employeeIds.length === 0) {
      return [];
    }
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.employee_id IN (:...ids)', { ids: [...employeeIds] });
    if (filter?.status !== undefined) {
      qb.andWhere('p.payment_status = :status', { status: filter.status });
    }
    if (filter?.from !== undefined) {
      qb.andWhere('p.period_start >= :from', { from: filter.from });
    }
    if (filter?.to !== undefined) {
      qb.andWhere('p.period_end <= :to', { to: filter.to });
    }
    qb.orderBy('p.created_at', 'DESC');
    const rows = await qb.getMany();
    return rows.map(toDomain);
  }

  public async findById(id: string): Promise<EmployeePayment | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomain(e) : null;
  }

  public async create(data: NewEmployeePayment): Promise<EmployeePayment> {
    const entity = this.toEntity(data);
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async upsertForPeriod(data: NewEmployeePayment): Promise<EmployeePayment> {
    const existing = await this.repo.findOne({
      where: { employeeId: data.employeeId, periodStart: data.periodStart, periodEnd: data.periodEnd },
    });
    if (existing) {
      existing.totalDays = data.totalDays ?? null;
      existing.totalHours = data.totalHours ?? null;
      existing.totalAmount = data.totalAmountCents;
      if (existing.paymentStatus !== 'paid') {
        existing.paymentStatus = data.paymentStatus ?? 'pending';
      }
      const saved = await this.repo.save(existing);
      return toDomain(saved);
    }
    return this.create(data);
  }

  public async markPaid(id: string, paymentDate: Date): Promise<EmployeePayment> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError('Payment not found');
    }
    entity.paymentStatus = 'paid';
    entity.paymentDate = paymentDate;
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  private toEntity(data: NewEmployeePayment): EmployeePaymentEntity {
    return this.repo.create({
      employeeId: data.employeeId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalDays: data.totalDays ?? null,
      totalHours: data.totalHours ?? null,
      totalAmount: data.totalAmountCents,
      paymentStatus: data.paymentStatus ?? 'pending',
      paymentDate: data.paymentDate ?? null,
    });
  }
}
