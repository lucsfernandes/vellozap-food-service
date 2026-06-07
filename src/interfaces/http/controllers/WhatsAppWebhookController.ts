import type { Request } from 'express';
import { HttpCode, JsonController, Post, Req } from 'routing-controllers';
import { injectable } from 'tsyringe';
import { HandleIncomingMessage } from '../../../application/use-cases/whatsapp/HandleIncomingMessage.js';

function normalizeHeaders(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      out[key.toLowerCase()] = value;
    } else if (Array.isArray(value) && value[0]) {
      out[key.toLowerCase()] = value[0];
    }
  }
  return out;
}

/** Public webhook endpoints. Always responds 200 to avoid provider retries/leaks. */
@injectable()
@JsonController('/whatsapp/webhook')
export class WhatsAppWebhookController {
  public constructor(private readonly handle: HandleIncomingMessage) {}

  @Post('/evolution')
  @HttpCode(200)
  public async evolution(@Req() req: Request): Promise<{ ok: boolean }> {
    await this.handle.execute({
      provider: 'evolution',
      headers: normalizeHeaders(req),
      rawBody: req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {})),
      body: req.body,
    });
    return { ok: true };
  }

  @Post('/n8n')
  @HttpCode(200)
  public async n8n(@Req() req: Request): Promise<{ ok: boolean }> {
    await this.handle.execute({
      provider: 'n8n',
      headers: normalizeHeaders(req),
      rawBody: req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {})),
      body: req.body,
    });
    return { ok: true };
  }
}
