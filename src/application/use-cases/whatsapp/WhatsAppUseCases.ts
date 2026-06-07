import { inject, injectable } from 'tsyringe';
import type { IConversationRepository } from '../../ports/repositories/IConversationRepository.js';
import type { IMessagingProvider } from '../../ports/IMessagingProvider.js';
import type { ConversationStatus, MessageStatus } from '../../../domain/enums/index.js';
import { ForbiddenError, NotFoundError } from '../../../domain/errors/index.js';
import { RestaurantContextResolver } from '../../services/RestaurantContextResolver.js';
import {
  toConversationDTO,
  toMessageDTO,
  type ConversationDTO,
  type MessageDTO,
} from '../../dtos/mappers.js';
import { loadEnv } from '../../../infrastructure/config/env.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

@injectable()
export class ListConversations {
  public constructor(
    @inject(TOKENS.ConversationRepository) private readonly conversations: IConversationRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, status?: ConversationStatus): Promise<ConversationDTO[]> {
    const restaurantId = await this.context.resolveRestaurantId(userId);
    const rows = await this.conversations.listByRestaurant(restaurantId, status);
    return rows.map(toConversationDTO);
  }
}

async function requireOwnedConversation(
  conversations: IConversationRepository,
  context: RestaurantContextResolver,
  userId: string,
  conversationId: string,
) {
  const restaurantId = await context.resolveRestaurantId(userId);
  const conversation = await conversations.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }
  if (conversation.restaurantId !== restaurantId) {
    throw new ForbiddenError('You do not own this conversation');
  }
  return conversation;
}

@injectable()
export class ListConversationMessages {
  public constructor(
    @inject(TOKENS.ConversationRepository) private readonly conversations: IConversationRepository,
    private readonly context: RestaurantContextResolver,
  ) {}

  public async execute(userId: string, conversationId: string): Promise<MessageDTO[]> {
    await requireOwnedConversation(this.conversations, this.context, userId, conversationId);
    const rows = await this.conversations.listMessages(conversationId);
    return rows.map(toMessageDTO);
  }
}

@injectable()
export class SendOutgoingMessage {
  public constructor(
    @inject(TOKENS.ConversationRepository) private readonly conversations: IConversationRepository,
    @inject(TOKENS.MessagingProvider) private readonly provider: IMessagingProvider,
    private readonly context: RestaurantContextResolver,
  ) {}

  /** Sends a message inside an existing conversation (owner dashboard reply). */
  public async sendToConversation(
    userId: string,
    conversationId: string,
    text: string,
  ): Promise<MessageDTO> {
    const conversation = await requireOwnedConversation(
      this.conversations,
      this.context,
      userId,
      conversationId,
    );

    const { message } = await this.conversations.appendMessage({
      conversationId,
      text,
      isFromCustomer: false,
      status: 'queued',
      sentAt: new Date(),
    });

    let finalStatus: MessageStatus = 'failed';
    try {
      const result = await this.provider.send({ to: conversation.customerPhone, text });
      finalStatus = result.status === 'failed' ? 'failed' : 'sent';
    } catch {
      finalStatus = 'failed';
    }
    const updated = await this.conversations.updateMessageStatus(message.id, finalStatus);
    await this.conversations.touch(conversationId, text, new Date(), 0);
    return toMessageDTO(updated);
  }

  /** Direct send to an arbitrary number (notifications). */
  public async sendDirect(
    userId: string,
    to: string,
    text: string,
  ): Promise<{ messageId: string; status: string }> {
    await this.context.resolveRestaurantId(userId);
    const result = await this.provider.send({ to, text });
    return { messageId: result.providerMessageId, status: result.status };
  }
}

@injectable()
export class GetWhatsAppStatus {
  public constructor(private readonly context: RestaurantContextResolver) {}

  public async execute(userId: string): Promise<{ provider: string; connected: boolean }> {
    await this.context.resolveRestaurantId(userId);
    const env = loadEnv();
    const connected =
      env.WHATSAPP_PROVIDER === 'evolution'
        ? Boolean(env.EVOLUTION_API_URL && env.EVOLUTION_API_KEY)
        : Boolean(env.N8N_WEBHOOK_URL);
    return { provider: env.WHATSAPP_PROVIDER, connected };
  }
}
