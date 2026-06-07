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

/** MANDATORY: a cross-tenant access must be denied (403/404), never leaked. */
test('owner B cannot read or mutate owner A product', async () => {
  const ownerA = await signupOwner(server, 'a@tenant.com');
  const ownerB = await signupOwner(server, 'b@tenant.com');

  const created = await api(server.url, '/api/products', {
    method: 'POST',
    token: ownerA.token,
    body: JSON.stringify({ name: 'Secret', price: 1000 }),
  });
  const productId = (created.body as { id: string }).id;

  const read = await api(server.url, `/api/products/${productId}`, { token: ownerB.token });
  assert.ok(read.status === 403 || read.status === 404, `expected 403/404, got ${read.status}`);

  const patch = await api(server.url, `/api/products/${productId}`, {
    method: 'PATCH',
    token: ownerB.token,
    body: JSON.stringify({ price: 1 }),
  });
  assert.ok(patch.status === 403 || patch.status === 404, `expected 403/404, got ${patch.status}`);

  // Owner A is still able to read it.
  const ownerRead = await api(server.url, `/api/products/${productId}`, { token: ownerA.token });
  assert.equal(ownerRead.status, 200);
});

test('owner B cannot delete owner A employee', async () => {
  const ownerA = await signupOwner(server, 'ea@tenant.com');
  const ownerB = await signupOwner(server, 'eb@tenant.com');

  const created = await api(server.url, '/api/employees', {
    method: 'POST',
    token: ownerA.token,
    body: JSON.stringify({ name: 'Funcionário A', role: 'cozinheiro' }),
  });
  const employeeId = (created.body as { id: string }).id;

  const del = await api(server.url, `/api/employees/${employeeId}`, {
    method: 'DELETE',
    token: ownerB.token,
  });
  assert.ok(del.status === 403 || del.status === 404, `expected 403/404, got ${del.status}`);
});
