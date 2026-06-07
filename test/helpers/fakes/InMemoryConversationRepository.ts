import { randomUUID } from 'node:crypto';
import type {
  AppendMessageInput,
  AppendMessageResult,
  IConversationRepository,
  UpsertConversationInput,
} from '../../../src/application/ports/repositories/IConversationRepository.js';
import type { Conversation, Message } from '../../../src/domain/entities/whatsapp/Conversation.js';
import type { ConversationStatus, MessageStatus } from '../../../src/domain/enums/index.js';
import { NotFoundError } from '../../../src/domain/errors/index.js';

/** In-memory conversation repo mirroring the unique (conversationId, externalId) dedupe. */
export class InMemoryConversationRepository implements IConversationRepository {
  public readonly conversations = new Map<string, Conversation>();
  public readonly messages = new Map<string, Message>();

  public async listByRestaurant(
    restaurantId: string,
    status?: ConversationStatus,
  ): Promise<Conversation[]> {
    return [...this.conversations.values()].filter(
      (c) => c.restaurantId === restaurantId && (status === undefined || c.status === status),
    );
  }

  public async findById(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) ?? null;
  }

  public async findByPhone(restaurantId: string, customerPhone: string): Promise<Conversation | null> {
    for (const c of this.conversations.values()) {
      if (c.restaurantId === restaurantId && c.customerPhone === customerPhone) return c;
    }
    return null;
  }

  public async upsert(input: UpsertConversationInput): Promise<Conversation> {
    const existing = await this.findByPhone(input.restaurantId, input.customerPhone);
    if (existing) return existing;
    const now = new Date();
    const conv: Conversation = {
      id: randomUUID(),
      restaurantId: input.restaurantId,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone,
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
      status: 'nova',
      orderId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conv.id, conv);
    return conv;
  }

  public async listMessages(conversationId: string): Promise<Message[]> {
    return [...this.messages.values()].filter((m) => m.conversationId === conversationId);
  }

  public async appendMessage(input: AppendMessageInput): Promise<AppendMessageResult> {
    if (input.externalId) {
      for (const m of this.messages.values()) {
        if (m.conversationId === input.conversationId && m.externalId === input.externalId) {
          return { message: m, created: false };
        }
      }
    }
    const msg: Message = {
      id: randomUUID(),
      conversationId: input.conversationId,
      externalId: input.externalId ?? null,
      text: input.text,
      isFromCustomer: input.isFromCustomer,
      status: input.status,
      sentAt: input.sentAt ?? null,
      createdAt: new Date(),
    };
    this.messages.set(msg.id, msg);
    return { message: msg, created: true };
  }

  public async touch(
    conversationId: string,
    lastMessage: string,
    lastMessageAt: Date,
    incrementUnread: number,
  ): Promise<Conversation> {
    const conv = this.conversations.get(conversationId);
    if (!conv) throw new NotFoundError('Conversation not found');
    const updated: Conversation = {
      ...conv,
      lastMessage,
      lastMessageAt,
      unreadCount: Math.max(0, conv.unreadCount + incrementUnread),
      updatedAt: new Date(),
    };
    this.conversations.set(conversationId, updated);
    return updated;
  }

  public async updateMessageStatus(messageId: string, status: MessageStatus): Promise<Message> {
    const msg = this.messages.get(messageId);
    if (!msg) throw new NotFoundError('Message not found');
    const updated: Message = { ...msg, status };
    this.messages.set(messageId, updated);
    return updated;
  }
}
