import { inject, injectable } from 'tsyringe';
import type { IEmployeeRepository } from '../../ports/repositories/IEmployeeRepository.js';
import type { EmployeePatch } from '../../../domain/entities/Employee.js';
import { ForbiddenError, NotFoundError } from '../../../domain/errors/index.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import { toEmployeeDTO, type EmployeeDTO } from '../../dtos/mappers.js';
import type { CreateEmployeeBody, UpdateEmployeeBody } from '../../dtos/schemas.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

@injectable()
export class ListEmployees {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, role?: string): Promise<EmployeeDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const rows = await this.employees.listByRestaurant(restaurantId, role);
    return rows.map(toEmployeeDTO);
  }
}

@injectable()
export class GetEmployee {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, employeeId: string): Promise<EmployeeDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const employee = await this.employees.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    if (employee.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this employee');
    }
    return toEmployeeDTO(employee);
  }
}

@injectable()
export class CreateEmployee {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, body: CreateEmployeeBody): Promise<EmployeeDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const created = await this.employees.create({
      restaurantId,
      name: body.name,
      role: body.role,
      phone: body.phone ?? null,
      email: body.email ?? null,
      paymentType: body.payment_type ?? null,
      paymentValueCents: body.payment_value ?? null,
      pixKey: body.pix_key ?? null,
      bankName: body.bank_name ?? null,
      agency: body.agency ?? null,
      account: body.account ?? null,
    });
    return toEmployeeDTO(created);
  }
}

@injectable()
export class UpdateEmployee {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, employeeId: string, body: UpdateEmployeeBody): Promise<EmployeeDTO> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const employee = await this.employees.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    if (employee.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this employee');
    }
    const patch: EmployeePatch = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.role !== undefined) patch.role = body.role;
    if (body.phone !== undefined) patch.phone = body.phone ?? null;
    if (body.email !== undefined) patch.email = body.email ?? null;
    if (body.payment_type !== undefined) patch.paymentType = body.payment_type ?? null;
    if (body.payment_value !== undefined) patch.paymentValueCents = body.payment_value ?? null;
    if (body.pix_key !== undefined) patch.pixKey = body.pix_key ?? null;
    if (body.bank_name !== undefined) patch.bankName = body.bank_name ?? null;
    if (body.agency !== undefined) patch.agency = body.agency ?? null;
    if (body.account !== undefined) patch.account = body.account ?? null;
    const updated = await this.employees.update(employeeId, patch);
    return toEmployeeDTO(updated);
  }
}

@injectable()
export class DeleteEmployee {
  public constructor(
    @inject(TOKENS.EmployeeRepository) private readonly employees: IEmployeeRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, employeeId: string): Promise<void> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const employee = await this.employees.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    if (employee.restaurantId !== restaurantId) {
      throw new ForbiddenError('You do not own this employee');
    }
    await this.employees.delete(employeeId);
  }
}
