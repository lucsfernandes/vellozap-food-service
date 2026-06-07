import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EvolutionApiProvider } from '../../../src/infrastructure/messaging/EvolutionApiProvider.js';
import type { IHttpClient } from '../../../src/application/ports/IHttpClient.js';

const fakeHttp: IHttpClient = {
  async post() {
    return {} as never;
  },
  async get() {
    return {} as never;
  },
};

const evolutionFixture = {
  instance: 'vellozap',
  data: {
    key: { id: 'EVT123', remoteJid: '5511999998888@s.whatsapp.net', fromMe: false },
    message: { conversation: 'Quero uma pizza' },
    messageTimestamp: 1717689600,
    pushName: 'João',
  },
};

test('parseWebhook normalizes a messages.upsert payload', () => {
  const provider = new EvolutionApiProvider(fakeHttp);
  const msg = provider.parseWebhook({}, evolutionFixture);
  assert.equal(msg.provider, 'evolution');
  assert.equal(msg.from, '5511999998888');
  assert.equal(msg.text, 'Quero uma pizza');
  assert.equal(msg.externalId, 'EVT123');
  assert.ok(msg.timestamp instanceof Date);
});

test('parseWebhook reads extendedTextMessage text', () => {
  const provider = new EvolutionApiProvider(fakeHttp);
  const msg = provider.parseWebhook(
    {},
    {
      instance: 'vellozap',
      data: {
        key: { id: 'X', remoteJid: '5511888887777@s.whatsapp.net' },
        message: { extendedTextMessage: { text: 'Olá' } },
        messageTimestamp: '1717689600',
      },
    },
  );
  assert.equal(msg.text, 'Olá');
  assert.equal(msg.from, '5511888887777');
});

test('verifyWebhookSignature matches the configured secret header', () => {
  // EVOLUTION_WEBHOOK_SECRET=test-webhook-secret comes from .env
  const provider = new EvolutionApiProvider(fakeHttp);
  assert.equal(provider.verifyWebhookSignature({ apikey: 'test-webhook-secret' }, Buffer.from('')), true);
  assert.equal(provider.verifyWebhookSignature({ apikey: 'wrong' }, Buffer.from('')), false);
});
