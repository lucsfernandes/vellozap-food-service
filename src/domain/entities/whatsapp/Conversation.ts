import type { ConversationStatus, MessageStatus } from '../../enums/index.js';

/** Domain model mirroring `wa_conversations`. */
export interface Conversation {
  id: string;
  restaurantId: string;
  customerName: string | null;
  customerPhone: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  status: ConversationStatus;
  orderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Domain model mirroring `wa_messages`. */
export interface Message {
  id: string;
  conversationId: string;
  externalId: string | null;
  text: string;
  isFromCustomer: boolean;
  status: MessageStatus;
  sentAt: Date | null;
  createdAt: Date;
}
