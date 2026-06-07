import type { EmployeePaymentType } from '../enums/index.js';

/** Domain model mirroring `employees`. `paymentValueCents` is integer BRL cents. */
export interface Employee {
  id: string;
  restaurantId: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  paymentType: EmployeePaymentType | null;
  paymentValueCents: number | null;
  pixKey: string | null;
  bankName: string | null;
  agency: string | null;
  account: string | null;
  createdAt: Date;
}

export interface NewEmployee {
  restaurantId: string;
  name: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  paymentType?: EmployeePaymentType | null;
  paymentValueCents?: number | null;
  pixKey?: string | null;
  bankName?: string | null;
  agency?: string | null;
  account?: string | null;
}

export type EmployeePatch = Partial<Omit<NewEmployee, 'restaurantId'>>;
