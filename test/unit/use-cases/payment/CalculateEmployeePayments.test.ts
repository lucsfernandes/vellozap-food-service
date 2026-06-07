import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CalculateEmployeePayments } from '../../../../src/application/use-cases/payment/PaymentUseCases.js';
import { EmployeePaymentCalculator } from '../../../../src/domain/services/EmployeePaymentCalculator.js';
import { RestaurantContextResolver } from '../../../../src/application/services/RestaurantContextResolver.js';
import { InMemoryEmployeeRepository } from '../../../helpers/fakes/InMemoryEmployeeRepository.js';
import { InMemoryWorkRecordRepository } from '../../../helpers/fakes/InMemoryWorkRecordRepository.js';
import { InMemoryEmployeePaymentRepository } from '../../../helpers/fakes/InMemoryEmployeePaymentRepository.js';
import { InMemoryRestaurantRepository } from '../../../helpers/fakes/InMemoryRestaurantRepository.js';
import { FixedClock } from '../../../helpers/fakes/FixedClock.js';

function buildUseCase() {
  const employees = new InMemoryEmployeeRepository();
  const records = new InMemoryWorkRecordRepository();
  const payments = new InMemoryEmployeePaymentRepository();
  const restaurants = new InMemoryRestaurantRepository();
  const clock = new FixedClock('2026-06-15T12:00:00Z');
  const context = new RestaurantContextResolver(restaurants);
  const useCase = new CalculateEmployeePayments(
    employees,
    records,
    payments,
    clock,
    new EmployeePaymentCalculator(),
    context,
  );
  return { useCase, employees, records, payments, restaurants };
}

test('sums days × value for a daily employee in current month', async () => {
  const { useCase, employees, records, restaurants } = buildUseCase();
  restaurants.seed({ id: 'r1', userId: 'owner-1' });
  const emp = employees.seed({ restaurantId: 'r1', paymentType: 'daily', paymentValueCents: 8000 });
  records.seed({ employeeId: emp.id, workDate: '2026-06-02', daysWorked: 22 });

  const result = await useCase.execute('owner-1', { period: 'current_month' });
  assert.equal(result.length, 1);
  assert.equal(result[0]?.total_amount, 22 * 8000);
  assert.equal(result[0]?.payment_status, 'pending');
  assert.equal(result[0]?.period_start, '2026-06-01');
  assert.equal(result[0]?.period_end, '2026-06-30');
});

test('excludes work records outside the period', async () => {
  const { useCase, employees, records, restaurants } = buildUseCase();
  restaurants.seed({ id: 'r1', userId: 'owner-1' });
  const emp = employees.seed({ restaurantId: 'r1', paymentType: 'daily', paymentValueCents: 5000 });
  records.seed({ employeeId: emp.id, workDate: '2026-06-10', daysWorked: 10 });
  records.seed({ employeeId: emp.id, workDate: '2026-05-10', daysWorked: 99 });

  const result = await useCase.execute('owner-1', { period: 'current_month' });
  assert.equal(result[0]?.total_amount, 10 * 5000);
});

test('skips employees without a payment type', async () => {
  const { useCase, employees, restaurants } = buildUseCase();
  restaurants.seed({ id: 'r1', userId: 'owner-1' });
  employees.seed({ restaurantId: 'r1', paymentType: null });
  const result = await useCase.execute('owner-1', { period: 'current_month' });
  assert.equal(result.length, 0);
});
