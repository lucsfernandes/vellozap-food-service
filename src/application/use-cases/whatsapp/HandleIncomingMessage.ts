import { inject, injectable } from 'tsyringe';
import type { IConversationRepository } from '../../ports/repositories/IConversationRepository.js';
import type { IMessagingProvider } from '../../ports/IMessagingProvider.js';
import type { IRestaurantRepository } from '../../ports/repositories/IRestaurantRepository.js';
import { EvolutionApiProvider } from '../../../infrastructure/messaging/EvolutionApiProvider.js';
import { N8nProvider } from '../../../infrastructure/messaging/N8nProvider.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

export interface IncomingWebhookInput {
  provider: 'evolution' | 'n8n';
  headers: Record<string, string>;
  rawBody: Buffer;
  body: unknown;
}

export type IncomingWebhookResult = { ok: true } | { ok: false; reason: string };

/**
 * Handles an inbound WhatsApp webhook: verifies the signature, normalizes the
 * payload, resolves the restaurant by destination number, and persists the
 * conversation/message idempotently. Always returns 200 to the provider.
 */
@injectable()
export class HandleIncomingMessage {
  public constructor(
    @inject(EvolutionApiProvider) private readonly evolution: EvolutionApiProvider,
    @inject(N8nProvider) private readonly n8n: N8nProvider,
    @inject(TOKENS.ConversationRepository) private readonly conversations: IConversationRepository,
    @inject(TOKENS.RestaurantRepository) private readonly restaurants: IRestaurantRepository,
  ) {}

  public async execute(input: IncomingWebhookInput): Promise<IncomingWebhookResult> {
    const provider: IMessagingProvider = input.provider === 'n8n' ? this.n8n : this.evolution;

    if (!provider.verifyWebhookSignature(input.headers, input.rawBody)) {
      return { ok: false, reason: 'invalid_signature' };
    }

    let parsed;
    try {
      parsed = provider.parseWebhook(input.headers, input.body);
    } catch {
      return { ok: false, reason: 'unparseable' };
    }

    // Resolve restaurant by destination whatsapp number (digits-only compare).
    const restaurant = await this.findRestaurantByNumber(parsed.to);
    if (!restaurant) {
      return { ok: false, reason: 'unknown_restaurant' };
    }

    const conversation = await this.conversations.upsert({
      restaurantId: restaurant.id,
      customerPhone: parsed.from,
    });

    const text = parsed.text ?? '';
    const { created } = await this.conversations.appendMessage({
      conversationId: conversation.id,
      externalId: parsed.externalId || null,
      text,
      isFromCustomer: true,
      status: 'received',
      sentAt: parsed.timestamp,
    });

    // Only bump unread/last-message when the row was newly inserted. On webhook
    // redelivery the message is deduped (created === false), so skipping touch
    // avoids double-incrementing unread_count / re-updating last_message_at (H2).
    if (created) {
      await this.conversations.touch(conversation.id, text, parsed.timestamp, 1);
    }

    return { ok: true };
  }

  private async findRestaurantByNumber(toNumber: string) {
    // The Evolution `instance` may be the restaurant UUID (per-tenant config).
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRe.test(toNumber)) {
      const byId = await this.restaurants.findById(toNumber);
      if (byId) {
        return byId;
      }
    }
    const digits = toNumber.replace(/\D/g, '');
    if (digits.length === 0) {
      return null;
    }
    return this.restaurants.findByWhatsappNumber(digits);
  }
}
