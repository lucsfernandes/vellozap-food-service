import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { DataSource } from 'typeorm';
import { resetEnvCache } from '../../../src/infrastructure/config/env.js';
import { createTestDataSource, initTestDb, truncateAll } from '../../helpers/db.js';
import { api, startTestServer, type TestServer } from '../../helpers/http.js';

let ds: DataSource;
let server: TestServer;
const prevLoginMax = process.env.RATE_LIMIT_LOGIN_MAX;
const prevWindow = process.env.RATE_LIMIT_WINDOW_MS;

before(async () => {
  // Tight limit so the test trips the limiter deterministically (C2).
  process.env.RATE_LIMIT_LOGIN_MAX = '3';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  resetEnvCache();

  ds = createTestDataSource();
  await initTestDb(ds);
  await truncateAll(ds);
  server = await startTestServer(ds);
});

after(async () => {
  await server.close();
  await ds.destroy();
  if (prevLoginMax === undefined) delete process.env.RATE_LIMIT_LOGIN_MAX;
  else process.env.RATE_LIMIT_LOGIN_MAX = prevLoginMax;
  if (prevWindow === undefined) delete process.env.RATE_LIMIT_WINDOW_MS;
  else process.env.RATE_LIMIT_WINDOW_MS = prevWindow;
  resetEnvCache();
});

test('POST /auth/login is rate limited per IP (429 after the configured max)', async () => {
  const body = JSON.stringify({ email: 'nobody@teste.com', password: 'whatever' });

  // First `max` (3) requests are processed (401 — bad credentials).
  for (let i = 0; i < 3; i += 1) {
    const res = await api(server.url, '/api/auth/login', { method: 'POST', body });
    assert.equal(res.status, 401, `request ${i + 1} should not be rate limited yet`);
  }

  // The next request exceeds the limit → 429 with the standard error envelope.
  const limited = await api(server.url, '/api/auth/login', { method: 'POST', body });
  assert.equal(limited.status, 429);
  const limitedBody = limited.body as { error?: { code?: string } };
  assert.equal(limitedBody.error?.code, 'RATE_LIMITED');
});
