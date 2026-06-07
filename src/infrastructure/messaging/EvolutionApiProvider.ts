import { timingSafeEqual } from 'node:crypto';
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

interface EvolutionSendResponse {
  key?: { id?: string };
  status?: string;
}

/** Extracts the digits-only phone (E.164 without `+`) from an Evolution remoteJid. */
function jidToPhone(jid: string): string {
  return jid.split('@')[0]?.replace(/\D/g, '') ?? '';
}

@injectable()
export class EvolutionApiProvider implements IMessagingProvider {
  public readonly name = 'evolution' as const;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;
  private readonly webhookSecret: string;
  private readonly isProduction: boolean;

  public constructor(@inject(TOKENS.HttpClient) private readonly http: IHttpClient) {
    const env = loadEnv();
    this.baseUrl = env.EVOLUTION_API_URL.replace(/\/$/, '');
    this.apiKey = env.EVOLUTION_API_KEY;
    this.instance = env.EVOLUTION_INSTANCE;
    this.webhookSecret = env.EVOLUTION_WEBHOOK_SECRET;
    this.isProduction = env.NODE_ENV === 'production';
  }

  public async send(message: OutgoingMessage): Promise<SendResult> {
    const url = `${this.baseUrl}/message/sendText/${this.instance}`;
    const body = { number: message.to, text: message.text ?? '' };
    const res = await this.http.post<EvolutionSendResponse>(url, body, {
      headers: { apikey: this.apiKey },
    });
    return {
      providerMessageId: res.key?.id ?? '',
      status: res.status === 'error' ? 'failed' : 'sent',
    };
  }

  public parseWebhook(_headers: Record<string, string>, body: unknown): IncomingMessage {
    const payload = body as {
      data?: {
        key?: { id?: string; remoteJid?: string; fromMe?: boolean };
        message?: { conversation?: string; extendedTextMessage?: { text?: string } };
        messageTimestamp?: number | string;
        pushName?: string;
      };
      instance?: string;
    };
    const data = payload.data;
    if (!data?.key?.remoteJid) {
      throw new ValidationError('Unrecognized Evolution webhook payload');
    }
    const text = data.message?.conversation ?? data.message?.extendedTextMessage?.text;
    const tsRaw = data.messageTimestamp;
    const ts = typeof tsRaw === 'string' ? Number(tsRaw) : (tsRaw ?? 0);
    const result: IncomingMessage = {
      provider: 'evolution',
      externalId: data.key.id ?? '',
      from: jidToPhone(data.key.remoteJid),
      to: payload.instance ?? this.instance,
      timestamp: ts ? new Date(ts * 1000) : new Date(),
      raw: body,
    };
    if (text !== undefined) {
      result.text = text;
    }
    return result;
  }

  public verifyWebhookSignature(headers: Record<string, string>, _rawBody: Buffer): boolean {
    if (!this.webhookSecret) {
      // Fail CLOSED in production (H1): an unconfigured secret must reject, never
      // silently fail-open. In dev we stay permissive but warn loudly.
      if (this.isProduction) {
        return false;
      }
      console.warn(
        '[EvolutionApiProvider] EVOLUTION_WEBHOOK_SECRET not configured — accepting webhook without signature verification (dev only).',
      );
      return true;
    }
    const provided = headers['apikey'] ?? headers['x-webhook-secret'] ?? '';
    const a = Buffer.from(provided);
    const b = Buffer.from(this.webhookSecret);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
