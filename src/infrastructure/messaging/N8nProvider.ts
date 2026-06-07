import { createHmac, timingSafeEqual } from 'node:crypto';
import { inject, injectable } from 'tsyringe';
import type {
  IMessagingProvider,
  IncomingMessage,
  OutgoingMessage,
  SendResult,
} from '../../application/ports/IMessagingProvider.js';
import type { IHttpClient } from '../../application/ports/IHttpClient.js';
import { ValidationError } from '../../domain/errors/index.js';
import { loadEnv } from '../config/env.js';
import { TOKENS } from '../di/tokens.js';

interface N8nSendResponse {
  messageId?: string;
  status?: string;
}

@injectable()
export class N8nProvider implements IMessagingProvider {
  public readonly name = 'n8n' as const;
  private readonly webhookUrl: string;
  private readonly secret: string;
  private readonly isProduction: boolean;

  public constructor(@inject(TOKENS.HttpClient) private readonly http: IHttpClient) {
    const env = loadEnv();
    this.webhookUrl = env.N8N_WEBHOOK_URL;
    this.secret = env.N8N_WEBHOOK_SECRET;
    this.isProduction = env.NODE_ENV === 'production';
  }

  public async send(message: OutgoingMessage): Promise<SendResult> {
    const res = await this.http.post<N8nSendResponse>(
      this.webhookUrl,
      { to: message.to, text: message.text, template: message.template },
      { headers: { 'x-vellozap-signature': this.secret } },
    );
    return {
      providerMessageId: res.messageId ?? '',
      status: res.status === 'error' ? 'failed' : 'sent',
    };
  }

  public parseWebhook(_headers: Record<string, string>, body: unknown): IncomingMessage {
    // N8N is expected to deliver the canonical shape.
    const p = body as {
      from?: string;
      to?: string;
      text?: string;
      externalId?: string;
      timestamp?: string | number;
    };
    if (!p.from) {
      throw new ValidationError('Unrecognized N8N webhook payload');
    }
    const result: IncomingMessage = {
      provider: 'n8n',
      externalId: p.externalId ?? '',
      from: p.from.replace(/\D/g, ''),
      to: (p.to ?? '').replace(/\D/g, ''),
      timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
      raw: body,
    };
    if (p.text !== undefined) {
      result.text = p.text;
    }
    return result;
  }

  public verifyWebhookSignature(headers: Record<string, string>, rawBody: Buffer): boolean {
    if (!this.secret) {
      // Fail CLOSED in production (H1): reject when no secret is configured.
      if (this.isProduction) {
        return false;
      }
      console.warn(
        '[N8nProvider] N8N_WEBHOOK_SECRET not configured — accepting webhook without signature verification (dev only).',
      );
      return true;
    }
    const provided = headers['x-vellozap-signature'] ?? '';
    const expected = createHmac('sha256', this.secret).update(rawBody).digest('hex');
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
