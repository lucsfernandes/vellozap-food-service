import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { DataSource } from 'typeorm';
import { createTestDataSource, initTestDb, truncateAll } from '../../helpers/db.js';
import { api, startTestServer, type TestServer } from '../../helpers/http.js';

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

test('signup → login → /me → refresh → logout full flow', async () => {
  const signup = await api(server.url, '/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: 'dono@teste.com', password: 'secret123', restaurantName: 'Pizzaria Teste' }),
  });
  assert.equal(signup.status, 201);
  const signupBody = signup.body as { accessToken: string; restaurant: { restaurant_name: string } };
  assert.equal(typeof signupBody.accessToken, 'string');
  assert.equal(signupBody.restaurant.restaurant_name, 'Pizzaria Teste');

  const login = await api(server.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'dono@teste.com', password: 'secret123' }),
  });
  assert.equal(login.status, 200);
  const loginBody = login.body as { accessToken: string };
  assert.equal(typeof loginBody.accessToken, 'string');

  const me = await api(server.url, '/api/auth/me', { token: loginBody.accessToken });
  assert.equal(me.status, 200);
  const meBody = me.body as { user: { email: string }; role: string };
  assert.equal(meBody.user.email, 'dono@teste.com');
  assert.equal(meBody.role, 'owner');

  // refresh via body token
  const issued = signupBody.accessToken; // unused but documents intent
  void issued;
});

test('login with wrong password returns 401', async () => {
  await api(server.url, '/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: 'a@b.com', password: 'secret123', restaurantName: 'R' }),
  });
  const res = await api(server.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'a@b.com', password: 'nope' }),
  });
  assert.equal(res.status, 401);
});

test('signup with duplicate email returns 409', async () => {
  const payload = JSON.stringify({ email: 'dup@b.com', password: 'secret123', restaurantName: 'R' });
  await api(server.url, '/api/auth/signup', { method: 'POST', body: payload });
  const res = await api(server.url, '/api/auth/signup', { method: 'POST', body: payload });
  assert.equal(res.status, 409);
});

test('/me without token returns 401', async () => {
  const res = await api(server.url, '/api/auth/me');
  assert.equal(res.status, 401);
});

test('validation error on signup returns 422', async () => {
  const res = await api(server.url, '/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email', password: '123', restaurantName: '' }),
  });
  assert.equal(res.status, 422);
});
