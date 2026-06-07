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

async function createProduct(token: string, name: string, price: number): Promise<string> {
  const res = await api(server.url, '/api/products', {
    method: 'POST',
    token,
    body: JSON.stringify({ name, price }),
  });
  return (res.body as { id: string }).id;
}

test('public checkout recalculates totals; owner lists and advances status', async () => {
  const owner = await signupOwner(server, 'orders@o.com');
  const p1 = await createProduct(owner.token, 'Pizza', 4000);
  const p2 = await createProduct(owner.token, 'Refri', 600);

  const create = await api(server.url, `/api/public/restaurants/${owner.restaurantId}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      customer: { name: 'Cliente', phone: '5511999990000' },
      items: [
        { product_id: p1, quantity: 2 },
        { product_id: p2, quantity: 3 },
      ],
      payment_method: 'pix',
    }),
  });
  assert.equal(create.status, 200);
  const order = create.body as { orderId: string; status: string; total_amount: number };
  assert.equal(order.total_amount, 4000 * 2 + 600 * 3);
  assert.equal(order.status, 'pending');

  const list = await api(server.url, '/api/orders', { token: owner.token });
  assert.equal(list.status, 200);
  assert.equal((list.body as { total: number }).total, 1);

  const advance = await api(server.url, `/api/orders/${order.orderId}/status`, {
    method: 'PATCH',
    token: owner.token,
    body: JSON.stringify({ status: 'preparing' }),
  });
  assert.equal(advance.status, 200);
  assert.equal((advance.body as { status: string }).status, 'preparing');

  // invalid transition pending→delivered is rejected (422)
  const invalid = await api(server.url, `/api/orders/${order.orderId}/status`, {
    method: 'PATCH',
    token: owner.token,
    body: JSON.stringify({ status: 'pending' }),
  });
  // preparing→pending is not allowed
  assert.equal(invalid.status, 422);
});

test('public status endpoint returns items and total', async () => {
  const owner = await signupOwner(server, 'st@o.com');
  const p1 = await createProduct(owner.token, 'X', 1000);
  const create = await api(server.url, `/api/public/restaurants/${owner.restaurantId}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      customer: { name: 'C', phone: '551199' },
      items: [{ product_id: p1, quantity: 1 }],
      payment_method: 'money',
    }),
  });
  const orderId = (create.body as { orderId: string }).orderId;
  const status = await api(server.url, `/api/public/orders/${orderId}/status`);
  assert.equal(status.status, 200);
  assert.equal((status.body as { total_amount: number }).total_amount, 1000);
  assert.equal((status.body as { items: unknown[] }).items.length, 1);
});

test('cross-tenant: owner B cannot read owner A order', async () => {
  const ownerA = await signupOwner(server, 'oa@o.com');
  const ownerB = await signupOwner(server, 'ob@o.com');
  const p1 = await createProduct(ownerA.token, 'X', 1000);
  const create = await api(server.url, `/api/public/restaurants/${ownerA.restaurantId}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      customer: { name: 'C', phone: '551199' },
      items: [{ product_id: p1, quantity: 1 }],
      payment_method: 'pix',
    }),
  });
  const orderId = (create.body as { orderId: string }).orderId;
  const read = await api(server.url, `/api/orders/${orderId}`, { token: ownerB.token });
  assert.ok(read.status === 403 || read.status === 404, `expected 403/404, got ${read.status}`);
});
