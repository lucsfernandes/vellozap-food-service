# 08 — Roadmap de Implementação

Fases priorizadas, com dependências explícitas. Cada fase é entregável e testável de forma incremental. "DoD" = Definition of Done.

## Fase 0 — Fundação, DI e config
**Depende de:** nada.
- Inicializar projeto (`package.json`, `tsconfig`, ESLint), ESM + decorators (`07`).
- `reflect-metadata`, container tsyringe (`tokens.ts`, `container.ts`), bootstrap `main.ts`.
- `infrastructure/config/env.ts` (zod) + `data-source.ts` (`synchronize:false`).
- Servidor Express + routing-controllers + `useContainer`, `ErrorHandlerMiddleware`, `GET /health`.
- Smoke test de DI e de emissão de `emitDecoratorMetadata`.
**DoD:** `npm run dev` sobe, `/health` 200, container resolve um serviço dummy, 1 teste `node:test` passa.

## Fase 1 — Entidades e baseline de migrations
**Depende de:** Fase 0.
- Entidades TypeORM das 9 tabelas existentes (`infrastructure/database/entities`) com transformers de `numeric`.
- Baseline: gerar/escrever a migration baseline; `scripts/baseline.ts` que carimba o baseline como aplicado no banco Supabase (sem rodar `up`). Ver `02`.
- Repositórios TypeORM + ports + mapeadores `toDomain/toEntity`.
- Teste de integração de 1 repositório contra Postgres local (compose).
**DoD:** `migration:run` não tenta recriar tabelas existentes; repositório lê/escreve corretamente em DB local.

## Fase 2 — Autenticação própria
**Depende de:** Fase 1.
- Migration `0001-AddAuthTables` (`user_accounts`, `auth_identities`, `refresh_tokens`).
- `Argon2PasswordHasher`, `JwtTokenService`, repos de auth.
- Use cases: `SignUp`, `SignIn`, `RefreshTokens` (rotation + reuse detection), `SignOut`, `GetCurrentUser`.
- `authorizationChecker`/`currentUserChecker`, `@Authorized` no controller.
- `AuthController`. Cookie httpOnly de refresh + CORS credentials.
- Testes: unidade (rotation/reuse, hash/verify) + integração (login/refresh/me 401).
**DoD:** fluxo signup→login→/me→refresh→logout funciona; RBAC bloqueia rota protegida sem token.

## Fase 3 — Restaurant profile + Onboarding + Operating Hours
**Depende de:** Fase 2.
- `RestaurantContextResolver` (userId→restaurantId) e ownership guard central.
- Use cases + controllers: `restaurant/me` (GET/PATCH), `onboarding` (progress/complete), `operating-hours`.
- Storage provider para logo (substitui `LogoUpload`/supabase.storage).
- Testes de ownership (cross-tenant 403/404).
**DoD:** substitui `useRestaurantProfile` e `useOnboarding` ponta a ponta.

## Fase 4 — CRUD core: Products, Employees, Work Records
**Depende de:** Fase 3.
- Migration aditiva `products.category/size` (se confirmado).
- Use cases + controllers de `products`, `employees`, `work-records` (todos escopados por restaurante).
- Testes unit + integração.
**DoD:** substitui `ProductsStep`, `TeamStep`, `EmployeeForm`, `WorkRecordForm`, `MenuManagement`, `TeamManagement`.

## Fase 5 — Orders, Order Items, Public Menu, Delivery
**Depende de:** Fase 4 (produtos) e Fase 3 (restaurante).
- Domain services: `OrderStatusPolicy`, `DeliveryFeeCalculator`; `Money` VO.
- `CreateOrder` (recalcula preços/total no servidor, cria items, aplica delivery), `ListOrders`, `GetOrder`, `UpdateOrderStatus`, `stats`.
- Tabela `delivery_zones` (migration) + `delivery/zones`, `delivery/calculate` (mock distance provider).
- `PublicMenuController` (menu público + criar pedido + status).
- Testes: cálculo de total/itens, transições de status, cross-tenant.
**DoD:** substitui `PublicMenu`/`Checkout`, aba Pedidos/Visão Geral, `DeliveryZoneManager`.

## Fase 6 — Payments + Export
**Depende de:** Fase 4 (employees/work-records).
- Domain `EmployeePaymentCalculator` (daily×days, hourly×hours, monthly fixo).
- `CalculateEmployeePayments`, `MarkPaymentPaid`, `ExportPayments` (CSV).
- `CsvExportService`/`PdfExportService`; `ExportOrders`.
- Controllers `payments`, `export`.
- Testes de cálculo por período (FixedClock) + formato CSV.
**DoD:** substitui `PaymentControl`, `OrderExport`/`ExportPeriodModal`.

## Fase 7 — WhatsApp (Evolution + N8N)
**Depende de:** Fase 5 (orders) para fluxo de pedido via chat.
- Migrations `wa_conversations`, `wa_messages`.
- `IMessagingProvider`, `EvolutionApiProvider`, `N8nProvider`, `MessagingProviderFactory`.
- `HandleIncomingMessage` (webhook normalizado + idempotência + assinatura), `SendOutgoingMessage`.
- `WhatsAppWebhookController` (rawBody) + endpoints de conversas/mensagens.
- Notificação de status de pedido via WhatsApp (hook em `UpdateOrderStatus`).
- Testes de contrato (parseWebhook/signature) + envio (fake provider).
**DoD:** substitui `WhatsAppChat`; webhook recebe e persiste; envio funciona via provider configurado.

## Fase 8 — Promoções (estrutura inicial)
**Depende de:** Fase 4.
- Tabela `promotions` + CRUD básico (`PromotionsManagement` hoje vazio).
**DoD:** endpoints de promoções disponíveis; UI pode evoluir depois.

## Fase 9 — Migração do frontend
**Depende de:** Fases 2–7 conforme módulo.
- Criar `apiClient` (Axios) no frontend com interceptors (Bearer + refresh automático em 401).
- Substituir `src/integrations/supabase/client.ts` por chamadas à API; trocar `useAuth` para tokens próprios (storage seguro + refresh); `useRestaurantProfile`/`useOnboarding`/steps/forms passam a usar TanStack Query contra a API.
- Remover dependência de `supabase-js` e RLS do caminho do app.
- Plano de cutover de identidade (ver `02`: backfill `user_accounts` preservando UUIDs + reset de senha).
**DoD:** frontend não importa mais `supabase`; todos os fluxos passam pela API.

## Fase 10 — Hardening e extensões
**Depende de:** Fase 9.
- Login social Google (`SignInWithGoogle`, `GoogleIdentityProvider`).
- Distance provider real (ViaCEP + Maps), Realtime (se necessário), observabilidade (logs estruturados, métricas), rate limiting refinado, cobertura de testes alvo (`06`).

## Grafo de dependências (resumo)
```
F0 → F1 → F2 → F3 → F4 → F5 → F6
                          F5 → F7
                     F4 → F8
F2..F7 → F9 → F10
```

## Impacto/refatoração no frontend (resumo)
- `useAuth`: deixa de usar `supabase.auth`; passa a `POST /auth/*` + gerência de access/refresh.
- `ProtectedRoute`: mesma lógica, mas baseada no `/auth/me`.
- `useRestaurantProfile`, `useOnboarding`, `ProductsStep`, `TeamStep`, `EmployeeForm`, `WorkRecordForm`: trocam `supabase.from(...)` por chamadas REST.
- Componentes mock (`MenuManagement`, `PaymentControl`, `WhatsAppChat`, `DeliveryZoneManager`, `OrderExport`, dashboard overview, `PublicMenu`, `Checkout`): passam de mock para dados reais da API.
- Remover `src/integrations/supabase/*` ao final do cutover.
