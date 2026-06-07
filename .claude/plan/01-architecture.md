# 01 — Arquitetura (Clean Architecture + DI)

## Princípio do fluxo de dependências

Dependências apontam **sempre para dentro**. O núcleo (domain) não conhece TypeORM, Express, Axios nem tsyringe.

```
interfaces (HTTP/controllers, webhooks, middlewares)
        │  depende de
        ▼
application (use cases, ports/interfaces, DTOs)
        │  depende de
        ▼
domain (entities de negócio, value objects, regras, erros)
        ▲  implementa as ports de
        │
infrastructure (TypeORM repositories, providers Axios, hashing, jwt, config)
```

- `domain` e `application` definem **interfaces (ports)**: `IRestaurantRepository`, `IMessagingProvider`, `ITokenService`, `IPasswordHasher`, `IClock`, etc.
- `infrastructure` fornece **implementações (adapters)** dessas ports.
- `interfaces` (HTTP) só conhece use cases e DTOs; nunca toca TypeORM diretamente.
- A "wiring" (registro DI) acontece em um único lugar (`infrastructure/di/container.ts`), invertendo o controle: o núcleo recebe implementações por construtor.

> Nota: usamos `domain/entities` para as **entidades de domínio (regras)** e mantemos as **entidades de persistência TypeORM** em `infrastructure/database/entities`. Em v1, dado que o modelo é majoritariamente CRUD, é aceitável que a entidade TypeORM sirva também como modelo de domínio para reduzir mapeamento — mas regras ricas (cálculo de pagamento, status de pedido, zona de entrega) vivem em serviços/objetos de domínio puros. Ver "Estratégia de mapeamento" no fim.

## DI: tsyringe (recomendado) vs InversifyJS

**Recomendação: `tsyringe`.**

| Critério | tsyringe | InversifyJS |
|---|---|---|
| Boilerplate | Baixo (`@injectable`, `@inject`, `container.resolve`) | Alto (Container, `bind().to()`, `@injectable`+`@inject`) |
| Curva | Suave | Mais íngreme |
| Recursos avançados (named/tagged/contextual bindings, multi-inject) | Suficientes (`registerSingleton`, `register`, tokens) | Mais ricos |
| Integração `routing-controllers` | `useContainer` via adapter trivial | `useContainer` também suportado |
| Manutenção/peso | Leve | Mais pesado |

Para este domínio (CRUD + alguns serviços + providers plugáveis) o tsyringe cobre tudo: singletons (repos, providers, config), tokens para múltiplas implementações de `IMessagingProvider`, e `reflect-metadata` para `emitDecoratorMetadata`. Reservamos InversifyJS apenas se surgir necessidade real de bindings contextuais complexos.

### Padrão de DI com decorators (assinaturas, sem implementação completa)

```ts
// application/ports/IRestaurantRepository.ts
export interface IRestaurantRepository {
  findByOwnerUserId(userId: string): Promise<Restaurant | null>;
  findById(id: string): Promise<Restaurant | null>;
  update(id: string, patch: Partial<Restaurant>): Promise<Restaurant>;
  create(data: NewRestaurant): Promise<Restaurant>;
}

// tokens centralizados para evitar acoplamento a strings soltas
// infrastructure/di/tokens.ts
export const TOKENS = {
  RestaurantRepository: Symbol.for('IRestaurantRepository'),
  ProductRepository: Symbol.for('IProductRepository'),
  OrderRepository: Symbol.for('IOrderRepository'),
  MessagingProvider: Symbol.for('IMessagingProvider'),
  TokenService: Symbol.for('ITokenService'),
  PasswordHasher: Symbol.for('IPasswordHasher'),
  Clock: Symbol.for('IClock'),
} as const;

// application/use-cases/restaurant/UpdateRestaurantProfile.ts
@injectable()
export class UpdateRestaurantProfile {
  constructor(
    @inject(TOKENS.RestaurantRepository) private readonly repo: IRestaurantRepository,
  ) {}
  async execute(input: UpdateRestaurantProfileInput): Promise<RestaurantDTO> { /* ... */ }
}

// infrastructure/database/repositories/TypeOrmRestaurantRepository.ts
@injectable()
export class TypeOrmRestaurantRepository implements IRestaurantRepository { /* ... */ }

// infrastructure/di/container.ts
container.registerSingleton(TOKENS.RestaurantRepository, TypeOrmRestaurantRepository);
container.register(TOKENS.MessagingProvider, {
  useFactory: (c) => c.resolve(resolveMessagingProviderClass(env.WHATSAPP_PROVIDER)),
});
```

### Integração routing-controllers + tsyringe

```ts
// interfaces/http/server.ts
import { useContainer, useExpressServer } from 'routing-controllers';
import { container } from 'tsyringe';

useContainer({ get: (cls) => container.resolve(cls as any) });

useExpressServer(app, {
  routePrefix: '/api',
  controllers: [/* glob de *Controller */],
  middlewares: [ErrorHandlerMiddleware, RequestContextMiddleware],
  authorizationChecker: makeAuthorizationChecker(container), // ver 03-auth.md
  currentUserChecker: makeCurrentUserChecker(container),
  defaultErrorHandler: false,
});
```

```ts
// interfaces/http/controllers/RestaurantController.ts
@injectable()
@JsonController('/restaurant')
export class RestaurantController {
  constructor(
    @inject(UpdateRestaurantProfile) private readonly updateProfile: UpdateRestaurantProfile,
    @inject(GetMyRestaurant) private readonly getMine: GetMyRestaurant,
  ) {}

  @Get('/me')
  @Authorized(['owner'])
  me(@CurrentUser() user: AuthUser) { return this.getMine.execute({ userId: user.id }); }

  @Patch('/me')
  @Authorized(['owner'])
  update(@CurrentUser() user: AuthUser, @Body() body: UpdateRestaurantBody) {
    return this.updateProfile.execute({ userId: user.id, patch: body });
  }
}
```

## Estrutura de pastas completa de `vellozap-food-service/src`

```
src/
├── main.ts                         # bootstrap: reflect-metadata, container, DataSource, server
├── domain/
│   ├── entities/                   # modelos de domínio (regras de negócio puras)
│   │   ├── Restaurant.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   ├── OrderItem.ts
│   │   ├── Employee.ts
│   │   ├── WorkRecord.ts
│   │   ├── EmployeePayment.ts
│   │   ├── OnboardingProgress.ts
│   │   ├── OperatingHours.ts
│   │   └── auth/
│   │       ├── UserAccount.ts
│   │       └── RefreshTokenRecord.ts
│   ├── value-objects/
│   │   ├── Money.ts                # centavos / BRL, evita float
│   │   ├── Cep.ts
│   │   ├── PhoneBR.ts
│   │   └── DeliveryZone.ts
│   ├── services/                   # domain services (regra pura, sem IO)
│   │   ├── DeliveryFeeCalculator.ts
│   │   ├── EmployeePaymentCalculator.ts
│   │   └── OrderStatusPolicy.ts
│   ├── enums/
│   │   ├── OrderStatus.ts          # pending|preparing|ready|delivered|cancelled
│   │   ├── PaymentMethod.ts        # pix|money|card
│   │   ├── PaymentStatus.ts        # pending|paid
│   │   ├── EmployeePaymentType.ts  # daily|hourly|monthly
│   │   ├── EmployeeRole.ts
│   │   └── ProductCategory.ts      # menu|bebidas|sobremesas
│   └── errors/
│       ├── DomainError.ts          # base
│       ├── NotFoundError.ts
│       ├── ForbiddenError.ts
│       ├── ValidationError.ts
│       └── ConflictError.ts
├── application/
│   ├── ports/                      # interfaces (repos, services externos)
│   │   ├── repositories/
│   │   │   ├── IRestaurantRepository.ts
│   │   │   ├── IProductRepository.ts
│   │   │   ├── IOrderRepository.ts
│   │   │   ├── IOrderItemRepository.ts
│   │   │   ├── IEmployeeRepository.ts
│   │   │   ├── IWorkRecordRepository.ts
│   │   │   ├── IEmployeePaymentRepository.ts
│   │   │   ├── IOnboardingRepository.ts
│   │   │   ├── IOperatingHoursRepository.ts
│   │   │   ├── IUserAccountRepository.ts
│   │   │   └── IRefreshTokenRepository.ts
│   │   ├── IMessagingProvider.ts
│   │   ├── ITokenService.ts
│   │   ├── IPasswordHasher.ts
│   │   ├── IClock.ts
│   │   ├── IStorageProvider.ts     # upload de logo/imagem (substitui supabase.storage)
│   │   ├── IDistanceProvider.ts    # ViaCEP/Maps (mock em v1)
│   │   └── IExportService.ts       # CSV/PDF
│   ├── dtos/                       # input/output shapes + zod schemas
│   │   ├── auth/...
│   │   ├── restaurant/...
│   │   ├── product/...
│   │   ├── order/...
│   │   └── ...
│   └── use-cases/
│       ├── auth/
│       │   ├── SignUp.ts
│       │   ├── SignIn.ts
│       │   ├── RefreshTokens.ts
│       │   ├── SignOut.ts
│       │   └── GetCurrentUser.ts
│       ├── restaurant/
│       │   ├── GetMyRestaurant.ts
│       │   └── UpdateRestaurantProfile.ts
│       ├── product/
│       │   ├── ListProducts.ts
│       │   ├── CreateProduct.ts
│       │   ├── UpdateProduct.ts
│       │   └── DeleteProduct.ts
│       ├── order/
│       │   ├── CreateOrder.ts            # + order_items + cálculo total/delivery
│       │   ├── ListOrders.ts
│       │   ├── GetOrder.ts
│       │   ├── UpdateOrderStatus.ts
│       │   └── ExportOrders.ts
│       ├── employee/
│       │   ├── ListEmployees.ts
│       │   ├── CreateEmployee.ts
│       │   ├── UpdateEmployee.ts
│       │   └── DeleteEmployee.ts
│       ├── work-record/
│       │   └── CreateWorkRecord.ts
│       ├── payment/
│       │   ├── CalculateEmployeePayments.ts
│       │   ├── MarkPaymentPaid.ts
│       │   └── ExportPayments.ts
│       ├── onboarding/
│       │   ├── GetOnboardingProgress.ts
│       │   ├── MarkStepComplete.ts
│       │   └── CompleteOnboarding.ts
│       ├── operating-hours/
│       │   ├── GetOperatingHours.ts
│       │   └── UpsertOperatingHours.ts
│       ├── delivery/
│       │   └── CalculateDeliveryFee.ts
│       └── whatsapp/
│           ├── HandleIncomingMessage.ts  # webhook → evento domínio
│           └── SendOutgoingMessage.ts
├── infrastructure/
│   ├── config/
│   │   ├── env.ts                  # validação de env via zod
│   │   └── data-source.ts          # TypeORM DataSource (synchronize:false)
│   ├── database/
│   │   ├── entities/               # @Entity TypeORM mapeando tabelas existentes
│   │   │   ├── RestaurantProfileEntity.ts
│   │   │   ├── ProductEntity.ts
│   │   │   ├── OrderEntity.ts
│   │   │   ├── OrderItemEntity.ts
│   │   │   ├── EmployeeEntity.ts
│   │   │   ├── EmployeeWorkRecordEntity.ts
│   │   │   ├── EmployeePaymentEntity.ts
│   │   │   ├── OnboardingProgressEntity.ts
│   │   │   ├── OperatingHoursEntity.ts
│   │   │   ├── UserAccountEntity.ts        # NOVA (auth própria)
│   │   │   └── RefreshTokenEntity.ts       # NOVA (auth própria)
│   │   ├── repositories/           # adapters TypeORM das ports
│   │   └── migrations/
│   ├── auth/
│   │   ├── JwtTokenService.ts
│   │   ├── Argon2PasswordHasher.ts
│   │   └── providers/
│   │       └── GoogleIdentityProvider.ts   # stub/extensão futura
│   ├── messaging/
│   │   ├── EvolutionApiProvider.ts
│   │   ├── N8nProvider.ts
│   │   └── MessagingProviderFactory.ts
│   ├── storage/
│   │   └── LocalStorageProvider.ts # ou S3/Supabase Storage adapter
│   ├── external/
│   │   ├── ViaCepDistanceProvider.ts
│   │   └── http/AxiosHttpClient.ts
│   ├── export/
│   │   ├── CsvExportService.ts
│   │   └── PdfExportService.ts
│   ├── time/SystemClock.ts
│   └── di/
│       ├── tokens.ts
│       └── container.ts            # registro de todas as bindings
├── interfaces/
│   └── http/
│       ├── server.ts               # useExpressServer + useContainer
│       ├── controllers/
│       │   ├── AuthController.ts
│       │   ├── RestaurantController.ts
│       │   ├── ProductController.ts
│       │   ├── OrderController.ts
│       │   ├── EmployeeController.ts
│       │   ├── WorkRecordController.ts
│       │   ├── PaymentController.ts
│       │   ├── OnboardingController.ts
│       │   ├── OperatingHoursController.ts
│       │   ├── DeliveryController.ts
│       │   ├── ExportController.ts
│       │   ├── PublicMenuController.ts     # endpoints públicos (menu/checkout)
│       │   └── WhatsAppWebhookController.ts
│       ├── middlewares/
│       │   ├── ErrorHandlerMiddleware.ts   # DomainError → HTTP status
│       │   ├── RequestContextMiddleware.ts
│       │   └── RateLimitMiddleware.ts
│       └── auth/
│           ├── authorizationChecker.ts     # RBAC
│           └── currentUserChecker.ts
└── shared/
    ├── result/Result.ts            # opcional: Result<T,E>
    └── types/                      # tipos utilitários (DeepReadonly, etc.)
```

## Estratégia de mapeamento domain ↔ persistência

- **Repositórios** recebem/retornam **modelos de domínio** (`domain/entities`), nunca entidades TypeORM cruas para fora da camada de infra.
- Cada `TypeOrm*Repository` faz o mapeamento `Entity ↔ Domain` em funções `toDomain`/`toEntity` privadas.
- Em v1 é aceitável que o modelo de domínio seja um tipo/`class` simples espelhando a tabela; a regra de negócio fica nos **domain services** (`DeliveryFeeCalculator`, `EmployeePaymentCalculator`) e nos **use cases**, mantendo-os 100% testáveis sem banco.

## Erros → HTTP

`ErrorHandlerMiddleware` traduz:
- `NotFoundError` → 404
- `ValidationError` (e falha de zod) → 422
- `ForbiddenError` → 403
- `ConflictError` → 409
- `UnauthorizedError` (auth) → 401
- demais → 500 (log estruturado, sem vazar stack).
