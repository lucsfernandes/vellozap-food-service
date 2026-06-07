import {
  Authorized,
  Body,
  CurrentUser,
  Get,
  JsonController,
  Param,
  Post,
  QueryParam,
} from 'routing-controllers';
import { injectable } from 'tsyringe';
import {
  GetWhatsAppStatus,
  ListConversationMessages,
  ListConversations,
  SendOutgoingMessage,
} from '../../../application/use-cases/whatsapp/WhatsAppUseCases.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import { validate } from '../../../application/dtos/validate.js';
import { sendDirectMessageSchema, sendMessageSchema } from '../../../application/dtos/schemas.js';
import { CONVERSATION_STATUSES, type ConversationStatus } from '../../../domain/enums/index.js';

@injectable()
@JsonController('/whatsapp')
export class WhatsAppController {
  public constructor(
    private readonly listConversationsUc: ListConversations,
    private readonly listMessagesUc: ListConversationMessages,
    private readonly sendUc: SendOutgoingMessage,
    private readonly statusUc: GetWhatsAppStatus,
  ) {}

  @Get('/conversations')
  @Authorized(['owner'])
  public conversations(
    @CurrentUser() user: AuthUser,
    @QueryParam('status') status?: string,
  ): Promise<unknown> {
    const s =
      status && (CONVERSATION_STATUSES as ReadonlyArray<string>).includes(status)
        ? (status as ConversationStatus)
        : undefined;
    return this.listConversationsUc.execute(user.id, s);
  }

  @Get('/conversations/:id/messages')
  @Authorized(['owner'])
  public messages(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<unknown> {
    return this.listMessagesUc.execute(user.id, id);
  }

  @Post('/conversations/:id/messages')
  @Authorized(['owner'])
  public send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown): Promise<unknown> {
    const dto = validate(sendMessageSchema, body);
    return this.sendUc.sendToConversation(user.id, id, dto.text);
  }

  @Post('/messages/send')
  @Authorized(['owner'])
  public sendDirect(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<unknown> {
    const dto = validate(sendDirectMessageSchema, body);
    return this.sendUc.sendDirect(user.id, dto.to, dto.text);
  }

  @Get('/status')
  @Authorized(['owner'])
  public status(@CurrentUser() user: AuthUser): Promise<unknown> {
    return this.statusUc.execute(user.id);
  }
}
