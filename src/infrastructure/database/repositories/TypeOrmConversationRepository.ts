import { QueryFailedError, type DataSource, type Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type {
  AppendMessageInput,
  AppendMessageResult,
  IConversationRepository,
  UpsertConversationInput,
} from '../../../application/ports/repositories/IConversationRepository.js';
import type { Conversation, Message } from '../../../domain/entities/whatsapp/Conversation.js';
import type { ConversationStatus, MessageStatus } from '../../../domain/enums/index.js';
import { NotFoundError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../di/tokens.js';
import { WaConversationEntity } from '../entities/WaConversationEntity.js';
import { WaMessageEntity } from '../entities/WaMessageEntity.js';

function convToDomain(e: WaConversationEntity): Conversation {
  return {
    id: e.id,
    restaurantId: e.restaurantId,
    customerName: e.customerName,
    customerPhone: e.customerPhone,
    lastMessage: e.lastMessage,
    lastMessageAt: e.lastMessageAt,
    unreadCount: e.unreadCount,
    status: e.status as ConversationStatus,
    orderId: e.orderId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

/** Detects a Postgres unique-constraint violation (SQLSTATE 23505). */
function isUniqueViolation(err: unknown): boolean {
  if (err instanceof QueryFailedError) {
    const code = (err.driverError as { code?: string } | undefined)?.code;
    return code === '23505';
  }
  return false;
}

function msgToDomain(e: WaMessageEntity): Message {
  return {
    id: e.id,
    conversationId: e.conversationId,
    externalId: e.externalId,
    text: e.text,
    isFromCustomer: e.isFromCustomer,
    status: e.status as MessageStatus,
    sentAt: e.sentAt,
    createdAt: e.createdAt,
  };
}

@injectable()
export class TypeOrmConversationRepository implements IConversationRepository {
  private readonly repo: Repository<WaConversationEntity>;
  private readonly msgRepo: Repository<WaMessageEntity>;

  public constructor(@inject(TOKENS.DataSource) dataSource: DataSource) {
    this.repo = dataSource.getRepository(WaConversationEntity);
    this.msgRepo = dataSource.getRepository(WaMessageEntity);
  }

  public async listByRestaurant(restaurantId: string, status?: ConversationStatus): Promise<Conversation[]> {
    const where = status !== undefined ? { restaurantId, status } : { restaurantId };
    const rows = await this.repo.find({ where, order: { lastMessageAt: 'DESC' } });
    return rows.map(convToDomain);
  }

  public async findById(id: string): Promise<Conversation | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? convToDomain(e) : null;
  }

  public async findByPhone(restaurantId: string, customerPhone: string): Promise<Conversation | null> {
    const e = await this.repo.findOne({ where: { restaurantId, customerPhone } });
    return e ? convToDomain(e) : null;
  }

  public async upsert(input: UpsertConversationInput): Promise<Conversation> {
    const existing = await this.repo.findOne({
      where: { restaurantId: input.restaurantId, customerPhone: input.customerPhone },
    });
    if (existing) {
      if (input.customerName && !existing.customerName) {
        existing.customerName = input.customerName;
        await this.repo.save(existing);
      }
      return convToDomain(existing);
    }
    const entity = this.repo.create({
      restaurantId: input.restaurantId,
      customerPhone: input.customerPhone,
      customerName: input.customerName ?? null,
      status: 'nova',
      unreadCount: 0,
    });
    const saved = await this.repo.save(entity);
    return convToDomain(saved);
  }

  public async listMessages(conversationId: string): Promise<Message[]> {
    const rows = await this.msgRepo.find({ where: { conversationId }, order: { createdAt: 'ASC' } });
    return rows.map(msgToDomain);
  }

  public async appendMessage(input: AppendMessageInput): Promise<AppendMessageResult> {
    if (input.externalId) {
      const existing = await this.msgRepo.findOne({
        where: { conversationId: input.conversationId, externalId: input.externalId },
      });
      if (existing) {
        return { message: msgToDomain(existing), created: false };
      }
    }
    const entity = this.msgRepo.create({
      conversationId: input.conversationId,
      externalId: input.externalId ?? null,
      text: input.text,
      isFromCustomer: input.isFromCustomer,
      status: input.status,
      sentAt: input.sentAt ?? null,
    });
    try {
      const saved = await this.msgRepo.save(entity);
      return { message: msgToDomain(saved), created: true };
    } catch (err) {
      // Concurrent redelivery may race past the find-then-insert above and hit the
      // unique (conversation_id, external_id) index. Treat that as a dedupe: re-read
      // the winning row instead of surfacing a 500. See H2.
      if (input.externalId && isUniqueViolation(err)) {
        const winner = await this.msgRepo.findOne({
          where: { conversationId: input.conversationId, externalId: input.externalId },
        });
        if (winner) {
          return { message: msgToDomain(winner), created: false };
        }
      }
      throw err;
    }
  }

  public async touch(
    conversationId: string,
    lastMessage: string,
    lastMessageAt: Date,
    incrementUnread: number,
  ): Promise<Conversation> {
    const entity = await this.repo.findOne({ where: { id: conversationId } });
    if (!entity) {
      throw new NotFoundError('Conversation not found');
    }
    entity.lastMessage = lastMessage;
    entity.lastMessageAt = lastMessageAt;
    entity.unreadCount += incrementUnread;
    if (entity.unreadCount < 0) {
      entity.unreadCount = 0;
    }
    const saved = await this.repo.save(entity);
    return convToDomain(saved);
  }

  public async updateMessageStatus(messageId: string, status: MessageStatus): Promise<Message> {
    const entity = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!entity) {
      throw new NotFoundError('Message not found');
    }
    entity.status = status;
    const saved = await this.msgRepo.save(entity);
    return msgToDomain(saved);
  }
}
