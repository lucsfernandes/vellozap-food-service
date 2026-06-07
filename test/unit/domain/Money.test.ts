import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Money } from '../../../src/domain/value-objects/Money.js';
import { ValidationError } from '../../../src/domain/errors/index.js';

test('fromDecimal rounds to nearest cent', () => {
  assert.equal(Money.fromDecimal(12.5).cents, 1250);
  assert.equal(Money.fromDecimal(0.1).cents, 10);
});

test('add and multiply operate in cents', () => {
  const a = Money.fromCents(1000);
  const b = Money.fromCents(250);
  assert.equal(a.add(b).cents, 1250);
  assert.equal(a.multiply(3).cents, 3000);
});

test('fromCents rejects non-integers', () => {
  assert.throws(() => Money.fromCents(10.5), ValidationError);
});

test('toDecimal converts back', () => {
  assert.equal(Money.fromCents(1299).toDecimal(), 12.99);
});
