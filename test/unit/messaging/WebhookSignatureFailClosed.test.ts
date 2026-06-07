import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetEnvCache } from '../../../src/infrastructure/config/env.js';
import { EvolutionApiProvider } from '../../../src/infrastructure/messaging/EvolutionApiProvider.js';
import { N8nProvider } from '../../../src/infrastructure/messaging/N8nProvider.js';
import type { IHttpClient } from '../../../src/application/ports/IHttpClient.js';

const fakeHttp: IHttpClient = {
  async post() {
    return {} as never;
  },
  async get() {
    return {} as never;
  },
};

/**
 * Runs `fn` with a patched process.env, then restores the previous values and
 * the env cache. Providers read NODE_ENV at construction time, so we build the
 * provider inside the override window.
 */
async function withEnv(overrides: Record<string, string>, fn: () => void): Promise<void> {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    snapshot[key] = process.env[key];
    process.env[key] = overrides[key];
  }
  resetEnvCache();
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetEnvCache();
  }
}

test('Evolution: fails CLOSED in production when no webhook secret is configured (H1)', async () => {
  await withEnv(
    { NODE_ENV: 'production', EVOLUTION_API_URL: '', EVOLUTION_WEBHOOK_SECRET: '' },
    () => {
      const provider = new EvolutionApiProvider(fakeHttp);
      assert.equal(provider.verifyWebhookSignature({ apikey: 'anything' }, Buffer.from('')), false);
      assert.equal(provider.verifyWebhookSignature({}, Buffer.from('')), false);
    },
  );
});

test('Evolution: stays permissive in development when no secret is configured', async () => {
  await withEnv(
    { NODE_ENV: 'development', EVOLUTION_API_URL: '', EVOLUTION_WEBHOOK_SECRET: '' },
    () => {
      const provider = new EvolutionApiProvider(fakeHttp);
      assert.equal(provider.verifyWebhookSignature({}, Buffer.from('')), true);
    },
  );
});

test('N8N: fails CLOSED in production when no webhook secret is configured (H1)', async () => {
  await withEnv(
    { NODE_ENV: 'production', N8N_WEBHOOK_URL: '', N8N_WEBHOOK_SECRET: '' },
    () => {
      const provider = new N8nProvider(fakeHttp);
      assert.equal(provider.verifyWebhookSignature({}, Buffer.from('body')), false);
    },
  );
});
