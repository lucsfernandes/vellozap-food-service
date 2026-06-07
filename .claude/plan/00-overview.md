# 00 — Visão Geral

## Objetivo

Construir o serviço back-end `vellozap-food-service`: uma API REST em Node.js (ESM) + Express + TypeORM que **substitui o acesso direto do frontend ao Supabase**. Hoje o frontend (React 18 + Vite + TanStack Query) fala diretamente com o Supabase via `supabase-js` (auth + Postgres + RLS). A partir desta API, o frontend passará a chamar somente endpoints REST autenticados por JWT próprio, e toda a autorização (hoje feita por RLS no Postgres) passa a ser aplicada **na camada de aplicação**.

## Escopo

### Dentro do escopo (v1)
- Autenticação própria baseada em JWT (access + refresh), com abstração para login social (Google) futuro.
- CRUD completo dos 9 recursos existentes: `restaurant_profiles`, `products`, `orders`, `order_items`, `employees`, `employee_work_records`, `employee_payments`, `onboarding_progress`, `operating_hours`.
- Cálculo de delivery (zonas por distância), controle de pagamentos de funcionários (cálculo por período), exportação de pedidos/pagamentos (CSV/PDF), promoções (estrutura inicial — hoje vazio no front).
- Integração WhatsApp provider-agnostic (Evolution API + N8N) com webhooks de entrada e envio de saída.
- Estratégia de baseline de migrations sobre o banco Postgres já gerenciado pelo Supabase.
- Testes com `node:test` + `node:assert` (unidade de use cases + integração de endpoints/repos).

### Fora do escopo (v1, mas previsto na arquitetura)
- Login social Google (somente ponto de extensão desenhado, não implementado).
- Pagamentos online reais (PIX/cartão com integração ASAAS) — hoje o front só registra `payment_method`/`payment_status`.
- Cálculo real de distância (ViaCEP + Google Maps) — hoje é mock; desenhamos a interface do provider.
- Realtime (substituir Supabase Realtime) — fora da v1.

## Mapa do estado atual do frontend (extraído do código)

| Recurso | Onde o front toca hoje | Operação |
|---|---|---|
| `restaurant_profiles` | `useRestaurantProfile` | `select * eq user_id single`, `update eq user_id` |
| `restaurant_profiles` | `useOnboarding.completeOnboarding` | `update onboarding_completed eq user_id` |
| `onboarding_progress` | `useOnboarding` | `select * eq user_id`, `upsert {user_id, step_name, completed, completed_at}` |
| `products` | `onboarding/ProductsStep` | `select * eq restaurant_id limit 5`, `insert`, `update eq id` |
| `employees` | `onboarding/TeamStep`, `EmployeeForm` | `select * eq restaurant_id`, `insert`, `update eq id` |
| `employee_work_records` | `WorkRecordForm` | `insert {employee_id, work_date, hours_worked, days_worked}` |
| `auth` | `useAuth` | `onAuthStateChange`, `getSession`, `signOut` (e `AuthPage` é mock hoje) |

Os demais módulos do dashboard (`MenuManagement`, `PaymentControl`, `WhatsAppChat`, `DeliveryZoneManager`, `OrderExport`, `RestaurantDashboard` overview, `PublicMenu`, `Checkout`, `PromotionsManagement`) **operam hoje com mock data** mas definem o contrato funcional da API (ver `04-api-endpoints.md`). Por isso a API cobre tanto o que já persiste quanto o que o front simula.

## Decisões arquiteturais e trade-offs

1. **Clean Architecture** (domain → application/use cases → infrastructure → interfaces). Trade-off: mais boilerplate inicial; ganho: testabilidade (use cases puros), troca de provider (Evolution↔N8N, repositório TypeORM↔mock) sem tocar regra de negócio.

2. **DI por decorators com `tsyringe`** (recomendado sobre InversifyJS). Justificativa em `01-architecture.md`. Trade-off: tsyringe é mais simples/leve e suficiente; InversifyJS tem binding mais avançado mas verboso.

3. **Roteamento HTTP**: controllers com decorators via **`routing-controllers`** integrado ao container do tsyringe (`useContainer`). Alternativa avaliada: Express "puro" + decorators caseiros. Optamos por `routing-controllers` por maturidade e produtividade; ele cobre middlewares, guards (`@UseBefore`/`@Authorized`), validação e serialização.

4. **Autorização na aplicação, não na RLS**. O backend conecta no Postgres com credencial de serviço (bypassa RLS). Toda regra `auth.uid() = user_id` / "owner do restaurante" vira **policy/guard de aplicação** (ver `03-auth.md`). Trade-off: perde-se a defesa em profundidade do RLS; mitigação: testes de autorização obrigatórios + repositórios sempre escopados por `restaurantId`/`ownerUserId`.

5. **Mesmo banco do Supabase, TypeORM em modo não destrutivo**. `synchronize: false` sempre. Baseline migration que reflete o schema atual marcada como já aplicada. Detalhes em `02-data-model.md`.

6. **WhatsApp provider-agnostic**. Interface `IMessagingProvider` com implementações `EvolutionApiProvider` e `N8nProvider`. Webhooks de entrada normalizados para um evento de domínio único. Detalhes em `05-whatsapp-integration.md`.

7. **Testes nativos `node:test`**. Sem Jest/Vitest. Mocks de repositório/provider via implementações in-memory + injeção pelo container. Detalhes em `06-testing.md`.

## Documentos do plano
- `01-architecture.md` — Clean Architecture, estrutura de pastas, DI.
- `02-data-model.md` — entidades TypeORM + estratégia de migrations/baseline.
- `03-auth.md` — authenticator JWT, guards, RBAC, extensão social.
- `04-api-endpoints.md` — contrato REST completo.
- `05-whatsapp-integration.md` — providers Evolution/N8N, webhooks.
- `06-testing.md` — estratégia com `node:test`.
- `07-project-setup.md` — package.json, tsconfig, scripts, env, Docker.
- `08-roadmap.md` — fases priorizadas e dependências.
