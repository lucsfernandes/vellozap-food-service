# 05 — Integração WhatsApp (provider-agnostic)

## Objetivo
Receber mensagens de clientes (webhooks) e enviar respostas/notificações, com **prioridade para Evolution API + orquestração via N8N**, mas desenhado para trocar/empilhar providers sem alterar o domínio.

## Abstração de provider

```ts
// application/ports/IMessagingProvider.ts
export interface OutgoingMessage {
  to: string;                 // E.164 (ex.: 5511999998888)
  text?: string;
  template?: { name: string; params: Record<string, string> };
  mediaUrl?: string;
}
export interface SendResult { providerMessageId: string; status: 'queued' | 'sent' | 'failed'; }

export interface IncomingMessage {
  provider: 'evolution' | 'n8n';
  externalId: string;
  from: string;               // telefone do cliente (E.164)
  to: string;                 // número do restaurante (instância)
  text?: string;
  timestamp: Date;
  raw: unknown;               // payload bruto p/ auditoria
}

export interface IMessagingProvider {
  readonly name: 'evolution' | 'n8n';
  send(message: OutgoingMessage): Promise<SendResult>;
  /** normaliza o payload bruto do webhook do provider para IncomingMessage */
  parseWebhook(headers: Record<string, string>, body: unknown): IncomingMessage;
  /** valida assinatura/secret do webhook (anti-spoofing) */
  verifyWebhookSignature(headers: Record<string, string>, rawBody: Buffer): boolean;
}
```

A seleção do provider ativo vem de env `WHATSAPP_PROVIDER=evolution|n8n` via `MessagingProviderFactory`, registrado como singleton no container (ver `01`). Ambos os webhooks (`/webhook/evolution`, `/webhook/n8n`) ficam **sempre** montados; o envio de saída usa o provider configurado.

## Implementação Evolution API (`EvolutionApiProvider`)
- HTTP via `AxiosHttpClient` (port `IHttpClient`), base `EVOLUTION_API_URL`, header `apikey: EVOLUTION_API_KEY`, instância `EVOLUTION_INSTANCE`.
- `send()`: `POST {base}/message/sendText/{instance}` com `{ number, text }` (ou `sendMedia`/`sendTemplate`). Mapeia resposta para `SendResult`.
- `parseWebhook()`: Evolution envia eventos (`messages.upsert` etc.); extrair `key.remoteJid` (from), `message.conversation`/`extendedTextMessage.text`, `messageTimestamp`.
- `verifyWebhookSignature()`: validar `apikey`/token compartilhado no header ou allowlist de IP (Evolution não assina HMAC por padrão; usar secret em querystring/header configurado).

## Implementação N8N (`N8nProvider`)
- N8N atua como **orquestrador**: o backend pode (a) receber webhooks já normalizados que o N8N gera a partir da Evolution/Cloud API, e (b) enviar mensagens disparando um **N8N Webhook node** (`N8N_WEBHOOK_URL`) via Axios, que internamente chama a Evolution/Cloud API.
- `send()`: `POST {N8N_WEBHOOK_URL}` com `{ to, text, template }` + header secret `N8N_WEBHOOK_SECRET`.
- `parseWebhook()`: contrato definido por nós (recomenda-se o N8N entregar `{ from, to, text, externalId, timestamp }` já no formato canônico).
- `verifyWebhookSignature()`: HMAC do corpo com `N8N_WEBHOOK_SECRET` no header `x-vellozap-signature` (recomendado padronizar do lado do N8N).

> Recomendação de topologia: **Evolution API como gateway WhatsApp + N8N como orquestrador de fluxos** (roteamento, IA de atendimento, criação de pedido). O backend expõe webhook para o N8N e usa o N8N para envios complexos; para envios diretos simples, pode-se usar Evolution diretamente. A factory permite ambos.

## Webhooks de entrada (controller)

```ts
@JsonController('/whatsapp/webhook')
export class WhatsAppWebhookController {
  constructor(@inject(HandleIncomingMessage) private readonly handle: HandleIncomingMessage) {}

  @Post('/evolution')
  @HttpCode(200)
  async evolution(@Req() req: Request) {
    return this.handle.execute({ provider: 'evolution', headers: req.headers, rawBody: req.rawBody, body: req.body });
  }
  @Post('/n8n')
  @HttpCode(200)
  async n8n(@Req() req: Request) {
    return this.handle.execute({ provider: 'n8n', headers: req.headers, rawBody: req.rawBody, body: req.body });
  }
}
```

> É necessário capturar o `rawBody` (Buffer) para verificação de assinatura HMAC. Configurar `express.json({ verify })` para anexar `req.rawBody`.

## Use case `HandleIncomingMessage`
1. Resolve o provider pela origem da rota; `verifyWebhookSignature(headers, rawBody)` → se inválido, `ForbiddenError`/`401` (responder 200 vazio para não vazar, mas logar).
2. `parseWebhook` → `IncomingMessage`.
3. Resolve o restaurante pelo número de destino (`to` ↔ `restaurant_profiles.whatsapp_number`/instância).
4. Upsert de `wa_conversations` (por `from` + restaurante), append em `wa_messages` (`isFromCustomer=true`, status `read=false`, incrementa `unreadCount`).
5. (Opcional) dispara automação: se o N8N orquestra, apenas persiste; se o backend orquestra, aciona regras (ex.: enviar cardápio, criar rascunho de pedido).
6. Sempre responde `200` rápido (idempotência por `externalId` para evitar duplicatas em reentrega).

## Envio de saída — `SendOutgoingMessage`
1. Owner chama `POST /whatsapp/conversations/:id/messages` ou `/messages/send`.
2. Use case persiste a mensagem (`isFromCustomer=false`, status `queued`), chama `IMessagingProvider.send`.
3. Atualiza status conforme `SendResult` (`sent`/`failed`). Retorno do provider (`providerMessageId`) guardado para reconciliar `delivered`/`read` (se o provider enviar callbacks de status, tratados no mesmo webhook).

## Fluxo de pedido via WhatsApp (visão)
1. Cliente manda mensagem → webhook → conversa criada (`status='nova'`).
2. Atendimento (humano no dashboard, ou automação N8N/IA) coleta itens.
3. Ao confirmar, cria `order` + `order_items` (mesmo use case `CreateOrder` da API pública), vincula `conversation.orderId`.
4. Notificações de mudança de status do pedido (`UpdateOrderStatus`) podem disparar `SendOutgoingMessage` (ex.: "Pedido saiu para entrega").

## Persistência (tabelas novas — migrations aditivas, ver `02`)
- `wa_conversations`: `id, restaurant_id, customer_name?, customer_phone, last_message?, last_message_at?, unread_count int default 0, status text default 'nova', order_id uuid null, created_at, updated_at`.
- `wa_messages`: `id, conversation_id fk, external_id text null, text text, is_from_customer bool, status text, sent_at timestamptz, created_at`. Índice único por `(conversation_id, external_id)` para idempotência.

## Configuração (env — detalhes em `07`)
`WHATSAPP_PROVIDER`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `EVOLUTION_WEBHOOK_SECRET`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`.
