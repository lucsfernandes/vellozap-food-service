import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EmployeePaymentCalculator } from '../../../src/domain/services/EmployeePaymentCalculator.js';
import type { Employee } from '../../../src/domain/entities/Employee.js';
import type { WorkRecord } from '../../../src/domain/entities/WorkRecord.js';

const calc = new EmployeePaymentCalculator();

function emp(overrides: Partial<Employee>): Employee {
  return {
    id: 'e1',
    restaurantId: 'r1',
    name: 'X',
    role: 'cozinheiro',
    phone: null,
    email: null,
    paymentType: null,
    paymentValueCents: null,
    pixKey: null,
    bankName: null,
    agency: null,
    account: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function record(overrides: Partial<WorkRecord>): WorkRecord {
  return {
    id: 'w',
    employeeId: 'e1',
    workDate: '2026-06-01',
    hoursWorked: null,
    daysWorked: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

test('daily: sum(days) × value', () => {
  const result = calc.compute(emp({ paymentType: 'daily', paymentValueCents: 8000 }), [
    record({ daysWorked: 12 }),
    record({ daysWorked: 10 }),
  ]);
  assert.equal(result.totalDays, 22);
  assert.equal(result.totalAmountCents, 22 * 8000);
  assert.equal(result.totalHours, null);
});

test('hourly: sum(hours) × value, rounds cents', () => {
  const result = calc.compute(emp({ paymentType: 'hourly', paymentValueCents: 1550 }), [
    record({ hoursWorked: 8.5 }),
    record({ hoursWorked: 7.25 }),
  ]);
  assert.equal(result.totalHours, 15.75);
  assert.equal(result.totalAmountCents, Math.round(15.75 * 1550));
});

test('monthly: fixed value regardless of records', () => {
  const result = calc.compute(emp({ paymentType: 'monthly', paymentValueCents: 250000 }), [
    record({ daysWorked: 5 }),
  ]);
  assert.equal(result.totalAmountCents, 250000);
  assert.equal(result.totalDays, null);
});
