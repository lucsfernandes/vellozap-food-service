# 06 — Estratégia de Testes (node:test + node:assert)

Sem Jest/Vitest. Usamos o test runner nativo: `node --test` (e `node:test`, `node:assert/strict`). A Clean Architecture torna os use cases testáveis sem IO; integração usa banco real (ou container) e supertest-like via `fetch`/`undici`.

## Tipos de teste

1. **Unitários de use case** — núcleo da suíte. Sem rede/banco. Repositórios e providers substituídos por **fakes in-memory** ou stubs. Cobrem regras: cálculo de pagamento, taxa de entrega, transições de status de pedido, autorização (ownership), refresh rotation.
2. **Unitários de domain services** — `DeliveryFeeCalculator`, `EmployeePaymentCalculator`, `OrderStatusPolicy`, `Money`/`Cep` value objects. Puros, triviais de testar.
3. **Integração de repositórios** — `TypeOrm*Repository` contra um Postgres de teste (container/efêmero), validando o mapeamento entity↔domain e queries escopadas por `restaurantId`.
4. **Integração de endpoints (HTTP)** — sobe o app Express em porta efêmera, chama via `fetch`, valida status/shape e **autorização** (acessar recurso de outro restaurante → 403/404). Providers externos (WhatsApp, distância, storage) mockados.
5. **Contrato de provider WhatsApp** — `parseWebhook`/`verifyWebhookSignature` com payloads fixos (fixtures) de Evolution e N8N.

## Estrutura

```
src/
└── ...                       # código de produção
test/
├── helpers/
│   ├── container.ts          # cria container DI com fakes registrados
│   ├── fakes/
│   │   ├── InMemoryRestaurantRepository.ts
│   │   ├── InMemoryProductRepository.ts
│   │   ├── InMemoryOrderRepository.ts
│   │   ├── FakeTokenService.ts
│   │   ├── FakePasswordHasher.ts
│   │   ├── FakeMessagingProvider.ts
│   │   ├── FakeDistanceProvider.ts
│   │   └── FixedClock.ts
│   ├── http.ts               # startTestServer(): { url, close }
│   └── db.ts                 # cria DataSource de teste + migrations + truncate
├── unit/
│   ├── domain/
│   │   ├── EmployeePaymentCalculator.test.ts
│   │   ├── DeliveryFeeCalculator.test.ts
│   │   └── OrderStatusPolicy.test.ts
│   └── use-cases/
│       ├── auth/SignIn.test.ts
│       ├── auth/RefreshTokens.test.ts
│       ├── order/CreateOrder.test.ts
│       ├── payment/CalculateEmployeePayments.test.ts
│       └── restaurant/UpdateRestaurantProfile.test.ts
├── integration/
│   ├── repositories/TypeOrmOrderRepository.test.ts
│   └── http/
│       ├── auth.routes.test.ts
│       ├── products.routes.test.ts
│       ├── orders.routes.test.ts
│       └── authorization.test.ts        # cross-tenant deve falhar
└── contract/
    └── whatsapp/EvolutionApiProvider.parseWebhook.test.ts
```

## Mocks/fakes — estratégia
- **Repositórios in-memory**: implementam as mesmas ports (`IXRepository`) com `Map<string, T>`; permitem seed e assertions de estado. Injetados no container de teste via `container.register(TOKENS.X, { useValue: fake })`.
- **Clock fixo** (`FixedClock implements IClock`) para datas determinísticas (pagamentos por período, expiração de refresh).
- **Providers externos** (`FakeMessagingProvider`, `FakeDistanceProvider`, `FakeStorageProvider`): registram chamadas (spy) para assertions sem rede.
- **TokenService/PasswordHasher**: fakes determinísticos em unidade; nos testes de integração HTTP usar implementações reais (argon2/jwt) com segredos de teste.
- **DB de integração**: `DATABASE_URL` de teste (container Postgres efêmero ou schema dedicado). `before()` roda migrations; `beforeEach()` faz `TRUNCATE ... CASCADE`. Nunca apontar para o banco Supabase de produção.

## Exemplos de assinatura de teste

### Use case (unitário)
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CalculateEmployeePayments } from '../../../src/application/use-cases/payment/CalculateEmployeePayments.ts';
import { InMemoryEmployeeRepository } from '../../helpers/fakes/InMemoryEmployeeRepository.ts';
import { InMemoryWorkRecordRepository } from '../../helpers/fakes/InMemoryWorkRecordRepository.ts';
import { FixedClock } from '../../helpers/fakes/FixedClock.ts';

test('CalculateEmployeePayments soma dias × valor para funcionário diário', async () => {
  const employees = new InMemoryEmployeeRepository();
  const records = new InMemoryWorkRecordRepository();
  const emp = employees.seed({ payment_type: 'daily', payment_value: 8000 /* centavos */, restaurantId: 'r1' });
  records.seed({ employee_id: emp.id, work_date: '2026-06-02', days_worked: 22 });

  const useCase = new CalculateEmployeePayments(employees, records, new FixedClock('2026-06-30'));
  const result = await useCase.execute({ restaurantId: 'r1', period: 'current_month' });

  assert.equal(result.length, 1);
  assert.equal(result[0].total_amount, 22 * 8000);
  assert.equal(result[0].payment_status, 'pending');
});
```

### Autorização cross-tenant (use case/HTTP)
```ts
test('owner do restaurante B não acessa produto do restaurante A', async () => {
  const useCase = makeUpdateProduct(); // com fakes seeded: produto pertence a r-A
  await assert.rejects(
    () => useCase.execute({ ownerUserId: 'owner-B', productId: 'p-A', patch: { price: 1 } }),
    (err) => err instanceof ForbiddenError || err instanceof NotFoundError,
  );
});
```

### Endpoint (integração HTTP)
```ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../../helpers/http.ts';

let server: { url: string; close: () => Promise<void> };
before(async () => { server = await startTestServer(); });
after(async () => { await server.close(); });

test('POST /api/auth/login retorna accessToken com credenciais válidas', async () => {
  const res = await fetch(`${server.url}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'dono@teste.com', password: 'secret123' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(typeof body.accessToken === 'string');
});
```

### Contrato de provider
```ts
test('EvolutionApiProvider.parseWebhook normaliza messages.upsert', () => {
  const provider = new EvolutionApiProvider(fakeHttp, cfg);
  const msg = provider.parseWebhook({}, evolutionFixture);
  assert.equal(msg.provider, 'evolution');
  assert.equal(msg.from, '5511999998888');
  assert.equal(msg.text, 'Quero uma pizza');
});
```

## Execução
- `node --test` com glob de `test/**/*.test.ts` (TS via loader, ver `07`).
- Scripts: `test` (todos), `test:unit` (só `test/unit`), `test:integration`, `test:watch` (`node --test --watch`).
- Cobertura: `node --test --experimental-test-coverage` (nativo) para relatório básico.
- CI: subir Postgres efêmero antes de `test:integration`; unit roda sem dependências.

## Metas de cobertura (prioridade)
1. 100% dos **domain services** e regras de cálculo.
2. Use cases de auth (rotation/reuse), order (recalcular total/itens), payment, ownership/RBAC.
3. Pelo menos um teste de integração por controller cobrindo caminho feliz + 401/403.
