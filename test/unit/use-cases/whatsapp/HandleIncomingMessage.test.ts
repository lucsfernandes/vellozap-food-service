import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HandleIncomingMessage } from '../../../../src/application/use-cases/whatsapp/HandleIncomingMessage.js';
import { EvolutionApiProvider } from '../../../../src/infrastructure/messaging/EvolutionApiProvider.js';
import { N8nProvider } from '../../../../src/infrastructure/messaging/N8nProvider.js';
import type { IHttpClient } from '../../../../src/application/ports/IHttpClient.js';
import { InMemoryConversationRepository } from '../../../helpers/fakes/InMemoryConversationRepository.js';
import { InMemoryRestaurantRepository } from '../../../helpers/fakes/InMemoryRestaurantRepository.js';

const fakeHttp: IHttpClient = {
  async post() {
    return {} as never;
  },
  async get() {
    return {} as never;
  },
};

function setup() {
  const conversations = new InMemoryConversationRepository();
  const restaurants = new InMemoryRestaurantRepository();
  // The Evolution `instance` resolves to the restaurant UUID (per-tenant config).
  const restaurant = restaurants.seed({ userId: 'owner-1' });
  const evolution = new EvolutionApiProvider(fakeHttp);
  const n8n = new N8nProvider(fakeHttp);
  const useCase = new HandleIncomingMessage(evolution, n8n, conversations, restaurants);
  return { useCase, conversations, restaurant };
}

function payload(restaurantId: string, externalId: string) {
  return {
    instance: restaurantId,
    data: {
      key: { id: externalId, remoteJid: '5511999998888@s.whatsapp.net', fromMe: false },
      message: { conversation: 'Quero uma pizza' },
      messageTimestamp: 1717689600,
      pushName: 'João',
    },
  };
}

// EVOLUTION_WEBHOOK_SECRET=test-webhook-secret comes from .env (signature verified).
const headers = { apikey: 'test-webhook-secret' };

test('first delivery stores the message and increments unread_count once', async () => {
  const { useCase, conversations, restaurant } = setup();
  const body = payload(restaurant.id, 'EVT-1');

  const res = await useCase.execute({
    provider: 'evolution',
    headers,
    rawBody: Buffer.from(JSON.stringify(body)),
    body,
  });

  assert.deepEqual(res, { ok: true });
  assert.equal(conversations.messages.size, 1);
  const conv = [...conversations.conversations.values()][0]!;
  assert.equal(conv.unreadCount, 1);
  assert.equal(conv.lastMessage, 'Quero uma pizza');
});

test('webhook redelivery does NOT double-increment unread_count (H2)', async () => {
  const { useCase, conversations, restaurant } = setup();
  const body = payload(restaurant.id, 'EVT-1');
  const input = {
    provider: 'evolution' as const,
    headers,
    rawBody: Buffer.from(JSON.stringify(body)),
    body,
  };

  await useCase.execute(input);
  await useCase.execute(input); // redelivery with the same externalId
  await useCase.execute(input); // and again

  // Deduped by (conversationId, externalId): only one row, unread stays at 1.
  assert.equal(conversations.messages.size, 1);
  const conv = [...conversations.conversations.values()][0]!;
  assert.equal(conv.unreadCount, 1);
});

test('rejects a webhook with an invalid signature', async () => {
  const { useCase, conversations, restaurant } = setup();
  const body = payload(restaurant.id, 'EVT-2');

  const res = await useCase.execute({
    provider: 'evolution',
    headers: { apikey: 'wrong-secret' },
    rawBody: Buffer.from(JSON.stringify(body)),
    body,
  });

  assert.deepEqual(res, { ok: false, reason: 'invalid_signature' });
  assert.equal(conversations.messages.size, 0);
});
