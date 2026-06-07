import { randomUUID } from 'node:crypto';
import type { IEmployeeRepository } from '../../../src/application/ports/repositories/IEmployeeRepository.js';
import type { Employee, EmployeePatch, NewEmployee } from '../../../src/domain/entities/Employee.js';
import { NotFoundError } from '../../../src/domain/errors/index.js';

export class InMemoryEmployeeRepository implements IEmployeeRepository {
  public readonly items = new Map<string, Employee>();

  public seed(partial: Partial<Employee> & { restaurantId: string }): Employee {
    const e: Employee = {
      id: partial.id ?? randomUUID(),
      restaurantId: partial.restaurantId,
      name: partial.name ?? 'Employee',
      role: partial.role ?? 'atendente',
      phone: partial.phone ?? null,
      email: partial.email ?? null,
      paymentType: partial.paymentType ?? null,
      paymentValueCents: partial.paymentValueCents ?? null,
      pixKey: partial.pixKey ?? null,
      bankName: partial.bankName ?? null,
      agency: partial.agency ?? null,
      account: partial.account ?? null,
      createdAt: partial.createdAt ?? new Date(),
    };
    this.items.set(e.id, e);
    return e;
  }

  public async listByRestaurant(restaurantId: string, role?: string): Promise<Employee[]> {
    return [...this.items.values()].filter(
      (e) => e.restaurantId === restaurantId && (role === undefined || e.role === role),
    );
  }

  public async findById(id: string): Promise<Employee | null> {
    return this.items.get(id) ?? null;
  }

  public async create(data: NewEmployee): Promise<Employee> {
    return this.seed(data);
  }

  public async update(id: string, patch: EmployeePatch): Promise<Employee> {
    const existing = this.items.get(id);
    if (!existing) throw new NotFoundError('Employee not found');
    const updated: Employee = { ...existing, ...patch } as Employee;
    this.items.set(id, updated);
    return updated;
  }

  public async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
