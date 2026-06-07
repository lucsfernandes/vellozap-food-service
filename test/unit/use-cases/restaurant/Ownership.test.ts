import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateProduct, GetProduct } from '../../../../src/application/use-cases/product/ProductUseCases.js';
import { UpdateRestaurantProfile } from '../../../../src/application/use-cases/restaurant/UpdateRestaurantProfile.js';
import { RestaurantContextResolver } from '../../../../src/application/services/RestaurantContextResolver.js';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors/index.js';
import { InMemoryProductRepository } from '../../../helpers/fakes/InMemoryProductRepository.js';
import { InMemoryRestaurantRepository } from '../../../helpers/fakes/InMemoryRestaurantRepository.js';

function setup() {
  const restaurants = new InMemoryRestaurantRepository();
  const products = new InMemoryProductRepository();
  const rA = restaurants.seed({ id: 'r-A', userId: 'owner-A' });
  restaurants.seed({ id: 'r-B', userId: 'owner-B' });
  const productA = products.seed({ restaurantId: rA.id, priceCents: 1000, name: 'A-product' });
  const context = new RestaurantContextResolver(restaurants);
  return { restaurants, products, productA, context };
}

test('owner B cannot update a product of restaurant A (cross-tenant → Forbidden)', async () => {
  const { products, productA, context } = setup();
  const useCase = new UpdateProduct(products, context);
  await assert.rejects(
    () => useCase.execute('owner-B', productA.id, { price: 1 }),
    (err) => err instanceof ForbiddenError || err instanceof NotFoundError,
  );
});

test('owner B cannot read a product of restaurant A', async () => {
  const { products, productA, context } = setup();
  const useCase = new GetProduct(products, context);
  await assert.rejects(
    () => useCase.execute('owner-B', productA.id),
    (err) => err instanceof ForbiddenError || err instanceof NotFoundError,
  );
});

test('owner A can update their own product', async () => {
  const { products, productA, context } = setup();
  const useCase = new UpdateProduct(products, context);
  const updated = await useCase.execute('owner-A', productA.id, { price: 2500 });
  assert.equal(updated.price, 2500);
});

test('UpdateRestaurantProfile only touches the caller-owned restaurant', async () => {
  const { restaurants, context } = setup();
  const useCase = new UpdateRestaurantProfile(restaurants, context);
  const updated = await useCase.execute('owner-A', { restaurant_name: 'Renamed A' });
  assert.equal(updated.restaurant_name, 'Renamed A');
  assert.equal(updated.id, 'r-A');
});
