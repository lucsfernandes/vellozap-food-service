import type { Employee, EmployeePatch, NewEmployee } from '../../../domain/entities/Employee.js';

export interface IEmployeeRepository {
  listByRestaurant(restaurantId: string, role?: string): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  create(data: NewEmployee): Promise<Employee>;
  update(id: string, patch: EmployeePatch): Promise<Employee>;
  delete(id: string): Promise<void>;
}
