import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { DataSource } from 'typeorm';
import { createTestDataSource, initTestDb, truncateAll } from '../../helpers/db.js';
import { TypeOrmRestaurantRepository } from '../../../src/infrastructure/database/repositories/TypeOrmRestaurantRepository.js';
import { TypeOrmProductRepository } from '../../../src/infrastructure/database/repositories/TypeOrmProductRepository.js';
import { TypeOrmOrderRepository } from '../../../src/infrastructure/database/repositories/TypeOrmOrderRepository.js';
import { container } from 'tsyringe';
import { TOKENS } from '../../../src/infrastructure/di/tokens.js';

let ds: DataSource;

before(async () => {
  ds = createTestDataSource();
  await initTestDb(ds);
  container.register(TOKENS.DataSource, { useValue: ds });
});
after(async () => {
  await ds.destroy();
});
beforeEach(async () => {
  await truncateAll(ds);
});

test('createWithItems persists order + items atomically and maps cents', async () => {
  const restaurants = new TypeOrmRestaurantRepository(ds);
  const products = new TypeOrmProductRepository(ds);
  const orders = new TypeOrmOrderRepository(ds);

  const restaurant = await restaurants.create({ userId: '11111111-1111-1111-1111-111111111111', restaurantName: 'R' });
  const product = await products.create({ restaurantId: restaurant.id, name: 'P', priceCents: 1599 });

  const { order, items } = await orders.createWithItems(
    {
      restaurantId: restaurant.id,
      customerName: 'C',
      customerPhone: '5511',
      totalAmountCents: 3198,
    },
    [{ productId: product.id, quantity: 2, unitPriceCents: 1599, totalPriceCents: 3198 }],
  );

  assert.equal(order.totalAmountCents, 3198, 'numeric→cents transformer roundtrip');
  assert.equal(items.length, 1);
  assert.equal(items[0]?.unitPriceCents, 1599);

  const fetched = await orders.findByIdWithItems(order.id);
  assert.ok(fetched);
  assert.equal(fetched?.order.totalAmountCents, 3198);
  assert.equal(fetched?.items.length, 1);
});

test('listByRestaurant is scoped to the restaurant', async () => {
  const restaurants = new TypeOrmRestaurantRepository(ds);
  const orders = new TypeOrmOrderRepository(ds);
  const rA = await restaurants.create({ userId: '22222222-2222-2222-2222-222222222222', restaurantName: 'A' });
  const rB = await restaurants.create({ userId: '33333333-3333-3333-3333-333333333333', restaurantName: 'B' });
  await orders.createWithItems(
    { restaurantId: rA.id, customerName: 'a', customerPhone: '1', totalAmountCents: 100 },
    [],
  );
  await orders.createWithItems(
    { restaurantId: rB.id, customerName: 'b', customerPhone: '2', totalAmountCents: 200 },
    [],
  );

  const listA = await orders.listByRestaurant(rA.id);
  assert.equal(listA.total, 1);
  assert.equal(listA.data[0]?.restaurantId, rA.id);
});
