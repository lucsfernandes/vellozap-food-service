import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrderStatusPolicy } from '../../../src/domain/services/OrderStatusPolicy.js';
import { ValidationError } from '../../../src/domain/errors/index.js';

const policy = new OrderStatusPolicy();

test('allows linear progression pending→preparing→ready→delivered', () => {
  assert.equal(policy.canTransition('pending', 'preparing'), true);
  assert.equal(policy.canTransition('preparing', 'ready'), true);
  assert.equal(policy.canTransition('ready', 'delivered'), true);
});

test('allows cancellation from non-terminal states', () => {
  assert.equal(policy.canTransition('pending', 'cancelled'), true);
  assert.equal(policy.canTransition('preparing', 'cancelled'), true);
  assert.equal(policy.canTransition('ready', 'cancelled'), true);
});

test('rejects skipping and reversing', () => {
  assert.equal(policy.canTransition('pending', 'delivered'), false);
  assert.equal(policy.canTransition('delivered', 'pending'), false);
  assert.equal(policy.canTransition('cancelled', 'preparing'), false);
});

test('same status is a no-op (allowed)', () => {
  assert.equal(policy.canTransition('pending', 'pending'), true);
});

test('assertTransition throws ValidationError on invalid transition', () => {
  assert.throws(() => policy.assertTransition('delivered', 'ready'), ValidationError);
});
