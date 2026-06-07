import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CreateOrder } from '../../../../src/application/use-cases/order/CreateOrder.js';
import { DeliveryFeeCalculator } from '../../../../src/domain/services/DeliveryFeeCalculator.js';
import { NotFoundError, ValidationError } from '../../../../src/domain/errors/index.js';
import { InMemoryOrderRepository } from '../../../helpers/fakes/InMemoryOrderRepository.js';
import { InMemoryProductRepository } from '../../../helpers/fakes/InMemoryProductRepository.js';
import { InMemoryDeliveryZoneRepository } from '../../../helpers/fakes/InMemoryDeliveryZoneRepository.js';
import { FakeDistanceProvider } from '../../../helpers/fakes/FakeDistanceProvider.js';
import type { CreateOrderBody } from '../../../../src/application/dtos/schemas.js';

function buildUseCase(distanceKm = 2) {
  const orders = new InMemoryOrderRepository();
  const products = new InMemoryProductRepository();
  const zones = new InMemoryDeliveryZoneRepository();
  const useCase = new CreateOrder(
    orders,
    products,
    zones,
    new FakeDistanceProvider(distanceKm),
    new DeliveryFeeCalculator(),
  );
  return { useCase, orders, products, zones };
}

function body(items: CreateOrderBody['items'], cep?: string): CreateOrderBody {
  return {
    customer: { name: 'Cliente', phone: '5511999998888', ...(cep ? { cep } : {}) },
    items,
    payment_method: 'pix',
  };
}

test('recalculates totals from the product catalog (ignores any client price)', async () => {
  const { useCase, products } = buildUseCase();
  const p1 = products.seed({ restaurantId: 'r1', priceCents: 1500 });
  const p2 = products.seed({ restaurantId: 'r1', priceCents: 800 });

  const result = await useCase.execute(
    'r1',
    body([
      { product_id: p1.id, quantity: 2 },
      { product_id: p2.id, quantity: 1 },
    ]),
  );

  assert.equal(result.total_amount, 1500 * 2 + 800);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.total_price, 3000);
});

test('rejects a product from another restaurant', async () => {
  const { useCase, products } = buildUseCase();
  const foreign = products.seed({ restaurantId: 'other', priceCents: 1000 });
  await assert.rejects(
    () => useCase.execute('r1', body([{ product_id: foreign.id, quantity: 1 }])),
    ValidationError,
  );
});

test('rejects an unknown product', async () => {
  const { useCase } = buildUseCase();
  await assert.rejects(
    () => useCase.execute('r1', body([{ product_id: '00000000-0000-0000-0000-000000000000', quantity: 1 }])),
    NotFoundError,
  );
});

test('applies a delivery fee when CEP and zones are present', async () => {
  const { useCase, products, zones } = buildUseCase(2);
  const p1 = products.seed({ restaurantId: 'r1', priceCents: 1000 });
  zones.seed({ restaurantId: 'r1', minDistance: 0, maxDistance: 5, priceCents: 700, description: 'perto' });

  const result = await useCase.execute('r1', body([{ product_id: p1.id, quantity: 1 }], '01001-000'), '02002-000');
  assert.equal(result.total_amount, 1000 + 700);
});
