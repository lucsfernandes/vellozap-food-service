import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { DataSource } from 'typeorm';
import { createTestDataSource, initTestDb, truncateAll } from '../../helpers/db.js';
import { api, startTestServer, type TestServer } from '../../helpers/http.js';
import { signupOwner } from '../../helpers/auth.js';

let ds: DataSource;
let server: TestServer;

before(async () => {
  ds = createTestDataSource();
  await initTestDb(ds);
  server = await startTestServer(ds);
});
after(async () => {
  await server.close();
  await ds.destroy();
});
beforeEach(async () => {
  await truncateAll(ds);
});

test('owner creates, lists, updates and deletes a product (money in cents)', async () => {
  const owner = await signupOwner(server, 'owner@p.com');

  const created = await api(server.url, '/api/products', {
    method: 'POST',
    token: owner.token,
    body: JSON.stringify({ name: 'Pizza', price: 4500, category: 'menu' }),
  });
  assert.equal(created.status, 200);
  const product = created.body as { id: string; price: number; restaurant_id: string };
  assert.equal(product.price, 4500, 'price persists/roundtrips as integer cents');
  assert.equal(product.restaurant_id, owner.restaurantId);

  const list = await api(server.url, '/api/products', { token: owner.token });
  assert.equal(list.status, 200);
  assert.equal((list.body as unknown[]).length, 1);

  const patched = await api(server.url, `/api/products/${product.id}`, {
    method: 'PATCH',
    token: owner.token,
    body: JSON.stringify({ price: 5000, is_available: false }),
  });
  assert.equal((patched.body as { price: number }).price, 5000);

  const del = await api(server.url, `/api/products/${product.id}`, {
    method: 'DELETE',
    token: owner.token,
  });
  assert.equal(del.status, 204);
});

test('listing products without a token returns 401', async () => {
  const res = await api(server.url, '/api/products');
  assert.equal(res.status, 401);
});

test('decimal cents survive numeric transformer roundtrip', async () => {
  const owner = await signupOwner(server, 'owner2@p.com');
  const created = await api(server.url, '/api/products', {
    method: 'POST',
    token: owner.token,
    body: JSON.stringify({ name: 'Suco', price: 1299 }),
  });
  assert.equal((created.body as { price: number }).price, 1299);
});
