export interface OutgoingMessage {
  to: string;
  text?: string;
  template?: { name: string; params: Record<string, string> };
  mediaUrl?: string;
}

export interface SendResult {
  providerMessageId: string;
  status: 'queued' | 'sent' | 'failed';
}

export interface IncomingMessage {
  provider: 'evolution' | 'n8n';
  externalId: string;
  from: string;
  to: string;
  text?: string;
  timestamp: Date;
  raw: unknown;
}

export interface IMessagingProvider {
  readonly name: 'evolution' | 'n8n';
  send(message: OutgoingMessage): Promise<SendResult>;
  /** Normalizes a raw provider webhook body into a canonical IncomingMessage. */
  parseWebhook(headers: Record<string, string>, body: unknown): IncomingMessage;
  /** Validates the webhook signature/secret (anti-spoofing). */
  verifyWebhookSignature(headers: Record<string, string>, rawBody: Buffer): boolean;
}
