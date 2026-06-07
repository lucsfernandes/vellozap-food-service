import type { Conversation, Message } from '../../../domain/entities/whatsapp/Conversation.js';
import type { ConversationStatus, MessageStatus } from '../../../domain/enums/index.js';

export interface UpsertConversationInput {
  restaurantId: string;
  customerPhone: string;
  customerName?: string | null;
}

export interface AppendMessageInput {
  conversationId: string;
  externalId?: string | null;
  text: string;
  isFromCustomer: boolean;
  status: MessageStatus;
  sentAt?: Date | null;
}

/** Result of {@link IConversationRepository.appendMessage}. */
export interface AppendMessageResult {
  message: Message;
  /** True when a new row was inserted; false on idempotent redelivery dedupe. */
  created: boolean;
}

export interface IConversationRepository {
  listByRestaurant(restaurantId: string, status?: ConversationStatus): Promise<Conversation[]>;
  findById(id: string): Promise<Conversation | null>;
  findByPhone(restaurantId: string, customerPhone: string): Promise<Conversation | null>;
  upsert(input: UpsertConversationInput): Promise<Conversation>;
  listMessages(conversationId: string): Promise<Message[]>;
  /**
   * Appends a message; idempotent on (conversationId, externalId) when externalId is set.
   * Returns `created: false` when an existing row was found (redelivery) so callers
   * can avoid double-incrementing unread counts. See H2.
   */
  appendMessage(input: AppendMessageInput): Promise<AppendMessageResult>;
  touch(conversationId: string, lastMessage: string, lastMessageAt: Date, incrementUnread: number): Promise<Conversation>;
  updateMessageStatus(messageId: string, status: MessageStatus): Promise<Message>;
}
