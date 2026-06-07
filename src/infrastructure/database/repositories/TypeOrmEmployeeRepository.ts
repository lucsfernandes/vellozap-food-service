import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type { IEmployeeRepository } from '../../../application/ports/repositories/IEmployeeRepository.js';
import type { Employee, EmployeePatch, NewEmployee } from '../../../domain/entities/Employee.js';
import type { EmployeePaymentType } from '../../../domain/enums/index.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../di/tokens.js';
import { EmployeeEntity } from '../entities/EmployeeEntity.js';

function toDomain(e: EmployeeEntity): Employee {
  return {
    id: e.id,
    restaurantId: e.restaurantId,
    name: e.name,
    role: e.role,
    phone: e.phone,
    email: e.email,
    paymentType: (e.paymentType as EmployeePaymentType | null) ?? null,
    paymentValueCents: e.paymentValue,
    pixKey: e.pixKey,
    bankName: e.bankName,
    agency: e.agency,
    account: e.account,
    createdAt: e.createdAt,
  };
}

@injectable()
export class TypeOrmEmployeeRepository implements IEmployeeRepository {
  private readonly repo: Repository<EmployeeEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(EmployeeEntity);
  }

  public async listByRestaurant(restaurantId: string, role?: string): Promise<Employee[]> {
    const where = role !== undefined ? { restaurantId, role } : { restaurantId };
    const rows = await this.repo.find({ where, order: { createdAt: 'DESC' } });
    return rows.map(toDomain);
  }

  public async findById(id: string): Promise<Employee | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? toDomain(e) : null;
  }

  public async create(data: NewEmployee): Promise<Employee> {
    const entity = this.repo.create({
      restaurantId: data.restaurantId,
      name: data.name,
      role: data.role,
      phone: data.phone ?? null,
      email: data.email ?? null,
      paymentType: data.paymentType ?? null,
      paymentValue: data.paymentValueCents ?? null,
      pixKey: data.pixKey ?? null,
      bankName: data.bankName ?? null,
      agency: data.agency ?? null,
      account: data.account ?? null,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async update(id: string, patch: EmployeePatch): Promise<Employee> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError('Employee not found');
    }
    if (patch.name !== undefined) entity.name = patch.name;
    if (patch.role !== undefined) entity.role = patch.role;
    if (patch.phone !== undefined) entity.phone = patch.phone ?? null;
    if (patch.email !== undefined) entity.email = patch.email ?? null;
    if (patch.paymentType !== undefined) entity.paymentType = patch.paymentType ?? null;
    if (patch.paymentValueCents !== undefined) entity.paymentValue = patch.paymentValueCents ?? null;
    if (patch.pixKey !== undefined) entity.pixKey = patch.pixKey ?? null;
    if (patch.bankName !== undefined) entity.bankName = patch.bankName ?? null;
    if (patch.agency !== undefined) entity.agency = patch.agency ?? null;
    if (patch.account !== undefined) entity.account = patch.account ?? null;
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
