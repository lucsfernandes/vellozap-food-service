# 02 — Modelo de Dados (TypeORM) e Estratégia de Migrations

## Premissas

- O banco Postgres **já existe** e é gerenciado pelo Supabase. As 9 tabelas, tipos `uuid`, defaults (`gen_random_uuid()`, `now()`), FKs e CHECKs já foram criados pelas migrations Supabase (ver `supabase/migrations/`).
- O TypeORM **NUNCA** deve recriar/alterar essas tabelas automaticamente: `synchronize: false` sempre, em todos os ambientes.
- O backend conecta com credencial de serviço (role com bypass de RLS). As políticas RLS existentes deixam de ser a fronteira de segurança e migram para guards de aplicação (ver `03-auth.md`).
- Tipos numéricos vêm como `numeric(p,s)` no Postgres. O driver `pg` retorna `numeric` como **string**. Mapear com `transformer` para `number`/centavos para evitar perda. Recomenda-se `Money` (centavos) em domínio.

## Entidades TypeORM (mapeamento das tabelas existentes)

Convenções: todas as `@Entity({ name: '<tabela>' })` apontam para o nome exato da tabela; `@PrimaryGeneratedColumn('uuid')`; colunas `created_at`/`updated_at` mapeadas mas **sem** deixar o TypeORM gerenciar default (o default já existe no banco). Usar `@Column({ type: 'timestamptz', nullable: true })` e deixar o banco preencher onde houver default, ou setar no use case via `IClock`.

### 1. `restaurant_profiles` → `RestaurantProfileEntity`
Colunas: `id uuid pk`, `user_id uuid` (FK lógica para auth — ver nota), `restaurant_name text`, `phone`, `address`, `logo_url`, `responsible_name`, `cnpj`, `email`, `delivery_type text default 'delivery'`, `whatsapp_number`, `delivery_radius text default '10km'`, `onboarding_completed boolean not null default false`, `created_at timestamptz`, `updated_at timestamptz`.
Relations: `@OneToMany` para products, orders, employees, operating_hours.

### 2. `products` → `ProductEntity`
`id`, `restaurant_id uuid` (FK), `name text`, `description text null`, `price numeric(?,?)` (no schema atual é `number`; o front usa decimais — mapear via transformer para centavos), `image_url text null`, `is_available boolean not null default true`, `stock_quantity int null`, `created_at`, `updated_at`.
> Observação: o front (`MenuManagement`) usa `size` e `category (menu|bebidas|sobremesas)` que **não existem** na tabela hoje. Ver "Lacunas de schema".

### 3. `orders` → `OrderEntity`
`id`, `restaurant_id uuid` FK, `customer_name text`, `customer_phone text`, `customer_address text null`, `status text not null default 'pending'`, `payment_method text null`, `payment_status text null`, `total_amount numeric`, `notes text null`, `created_at`, `updated_at`.
Relations: `@OneToMany(() => OrderItemEntity)`.
Enums de domínio (não no banco hoje): status `pending|preparing|ready|delivered|cancelled`.

### 4. `order_items` → `OrderItemEntity`
`id`, `order_id uuid` FK, `product_id uuid` FK, `quantity int default 1`, `unit_price numeric`, `total_price numeric`, `notes text null`, `created_at`.

### 5. `employees` → `EmployeeEntity`
`id`, `restaurant_id uuid` FK, `name text`, `role text`, `phone null`, `email null`, `payment_type text null` (CHECK `daily|hourly|monthly`), `payment_value numeric(10,2) null`, `pix_key text null`, `bank_name null`, `agency null`, `account null`, `created_at`.

### 6. `employee_work_records` → `EmployeeWorkRecordEntity`
`id`, `employee_id uuid` FK ON DELETE CASCADE, `work_date date`, `hours_worked numeric(4,2) null`, `days_worked int null`, `created_at timestamptz`, `updated_at timestamptz`.

### 7. `employee_payments` → `EmployeePaymentEntity`
`id`, `employee_id uuid` FK ON DELETE CASCADE, `period_start date`, `period_end date`, `total_days numeric(5,2) null`, `total_hours numeric(8,2) null`, `total_amount numeric(10,2) not null`, `payment_status text default 'pending'` (CHECK `pending|paid`), `payment_date timestamptz null`, `created_at`, `updated_at`.

### 8. `onboarding_progress` → `OnboardingProgressEntity`
`id`, `user_id uuid` (FK p/ auth.users hoje — ver nota), `step_name text`, `completed boolean not null default false`, `completed_at timestamptz null`, `created_at timestamptz`. Constraint `UNIQUE(user_id, step_name)`.

### 9. `operating_hours` → `OperatingHoursEntity`
`id`, `restaurant_id uuid` FK, `day_of_week int` (0–6), `is_open boolean not null default true`, `open_time time null`, `close_time time null`, `created_at`.

## Tabelas NOVAS para auth própria

Como deixamos de depender do Supabase Auth, precisamos de tabelas próprias de identidade. **Não** reutilizar `auth.users` do Supabase.

### `user_accounts` → `UserAccountEntity` (NOVA)
`id uuid pk`, `email citext unique` (ou `text` + unique lower), `password_hash text null` (null para contas só-social), `display_name text null`, `is_active boolean default true`, `email_verified boolean default false`, `created_at`, `updated_at`.

### `auth_identities` → `AuthIdentityEntity` (NOVA, para social plugável)
`id uuid pk`, `user_id uuid` FK → user_accounts, `provider text` (`password|google`), `provider_subject text` (sub do IdP; para password = email), `UNIQUE(provider, provider_subject)`. Permite múltiplos métodos por usuário sem refazer auth.

### `refresh_tokens` → `RefreshTokenEntity` (NOVA)
`id uuid pk`, `user_id uuid` FK, `token_hash text` (hash do refresh, nunca o token cru), `expires_at timestamptz`, `revoked_at timestamptz null`, `created_at`, `user_agent text null`, `ip text null`.

> Migração de relacionamento: hoje `restaurant_profiles.user_id` e `onboarding_progress.user_id` referenciam `auth.users(id)` do Supabase. Na transição, esses `user_id` passarão a referenciar `user_accounts(id)`. Estratégia em "Plano de migração de identidade".

## Estratégia de migrations / baseline (crucial)

O risco: rodar `migration:run` do TypeORM em um banco cujas 9 tabelas já existem causaria erro (objetos já existentes) ou, pior, com `synchronize` ligado, alteraria o schema gerenciado pelo Supabase.

### Regras
1. `synchronize: false` e `migrationsRun: false` em produção. Migrations rodadas explicitamente via script.
2. **Baseline**: criar uma migration inicial `0000000000000-Baseline` que descreve as 9 tabelas existentes **mas cujo `up()` é idempotente/no-op** quando os objetos já existem.

### Abordagem recomendada (baseline "marca como aplicada")
- Gerar a migration de baseline a partir do schema atual (pode-se usar `typeorm migration:generate` apontando para um banco **vazio** só para obter o SQL de referência, ou escrever à mão a partir de `types.ts` + migrations Supabase).
- No ambiente que já tem as tabelas (Supabase), **inserir manualmente** o registro do baseline na tabela de controle do TypeORM (`migrations`) sem executar o `up()`, "carimbando" o baseline como já aplicado:

```sql
-- executado uma única vez no banco Supabase existente
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  name VARCHAR NOT NULL
);
INSERT INTO migrations (timestamp, name)
VALUES (0, 'Baseline0000000000000');
```

- A partir daí, **toda nova alteração** de schema é uma migration TypeORM normal (`migration:generate`/`migration:create` + `migration:run`), aplicada incrementalmente após o baseline.
- As novas tabelas de auth (`user_accounts`, `auth_identities`, `refresh_tokens`) entram como a **primeira migration real** após o baseline (ex.: `0001-AddAuthTables`).

### Configuração do DataSource (resumo)
Credenciais do Supabase🧮 (valores reais ficam apenas no `.env` gitignored):
host: <DB_HOST>
port: 6543
database: postgres
user: <DB_USER>
password: <DB_PASSWORD>

URL do Shared Pooler: 'postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:6543/postgres'
```ts
// infrastructure/config/data-source.ts
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,            // role de serviço (bypassa RLS)
  // TLS obrigatório contra o Postgres do Supabase. NUNCA usar rejectUnauthorized:false
  // (abre MITM). Apontar para o CA do Supabase via DATABASE_CA_CERT.
  ssl: env.DATABASE_SSL
    ? { rejectUnauthorized: true, ca: env.DATABASE_CA_CERT }
    : false,
  synchronize: false,
  migrationsRun: false,
  logging: env.DB_LOGGING,
  entities: [/* glob das *Entity */],
  migrations: [/* glob de migrations */],
  migrationsTableName: 'migrations',
});
```

### Convivência com o schema Supabase
- **Não** alterar/remover as políticas RLS existentes nem dropar `auth.*`. A API simplesmente conecta com role que bypassa RLS; o RLS pode permanecer no banco como camada extra para qualquer acesso direto remanescente.
- Se uma alteração precisar tocar tabela compartilhada (ex.: adicionar `category`/`size` em `products`), fazê-la via migration TypeORM aditiva (apenas `ADD COLUMN ... NULL`), nunca destrutiva, documentando que o Supabase migrations também deve ser atualizado para manter paridade caso o Supabase ainda gere `types.ts`.

## Lacunas de schema detectadas (front usa, banco não tem)

| Necessidade do front | Tabela | Ação proposta (migration aditiva) |
|---|---|---|
| `category` (menu/bebidas/sobremesas) e `size` em produtos | `products` | `ADD COLUMN category text`, `ADD COLUMN size text` (nullable) |
| Promoções/combos | (nova) `promotions` | criar tabela quando o módulo sair do "vazio" — fora da v1 mínima |
| Zonas de entrega persistidas | (nova) `delivery_zones` | hoje mock no front; criar `delivery_zones (restaurant_id, min_distance, max_distance, price, description)` |
| CEP de origem do restaurante | `restaurant_profiles` | reutilizar `address`/adicionar `origin_cep text` se necessário |
| Conversas/mensagens WhatsApp | (nova) `wa_conversations`, `wa_messages` | criar para o módulo WhatsApp (ver `05`) |

Essas tabelas novas são introduzidas por migrations incrementais conforme o roadmap (`08`), sempre aditivas.

## Plano de migração de identidade (Supabase Auth → auth própria)

1. Criar tabelas de auth novas (migration `0001`).
2. Backfill: para cada `auth.users` existente que tenha `restaurant_profiles`, criar `user_accounts` com mesmo `id` (preservar UUID) e `auth_identities (provider='password')`. Como não temos o hash do Supabase, exigir **reset de senha no primeiro login** (fluxo "definir nova senha") OU manter os dois sistemas durante transição com um adaptador. Recomendado: e-mail de "defina sua senha".
3. As FKs `restaurant_profiles.user_id`/`onboarding_progress.user_id` continuam válidas pois preservamos os UUIDs.
4. Após cutover, remover dependência do Supabase Auth no frontend.
