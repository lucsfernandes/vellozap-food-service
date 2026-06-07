import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryFeeCalculator } from '../../../src/domain/services/DeliveryFeeCalculator.js';
import type { DeliveryZone } from '../../../src/domain/entities/DeliveryZone.js';

const calc = new DeliveryFeeCalculator();

const zones: DeliveryZone[] = [
  { id: 'z1', restaurantId: 'r1', minDistance: 0, maxDistance: 3, priceCents: 500, description: 'Até 3km' },
  { id: 'z2', restaurantId: 'r1', minDistance: 3, maxDistance: 7, priceCents: 900, description: '3-7km' },
];

test('returns the matching zone fee', () => {
  const result = calc.calculate(2, zones);
  assert.equal(result.canDeliver, true);
  assert.equal(result.deliveryFeeCents, 500);
  assert.equal(result.zone?.id, 'z1');
});

test('selects the correct zone at the boundary', () => {
  const result = calc.calculate(5, zones);
  assert.equal(result.deliveryFeeCents, 900);
});

test('returns no delivery beyond all zones', () => {
  const result = calc.calculate(20, zones);
  assert.equal(result.canDeliver, false);
  assert.equal(result.deliveryFeeCents, 0);
  assert.equal(result.zone, null);
  assert.match(result.message, /Fora da área/);
});
