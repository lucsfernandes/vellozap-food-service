# 07 — Setup do Projeto

## Decisões de runtime
- **Node.js latest LTS+** (≥ 22; ideal 24). ESM nativo (`"type": "module"`).
- **TypeScript** com **decorators legados** (`experimentalDecorators` + `emitDecoratorMetadata`) — exigido por TypeORM, tsyringe e routing-controllers (eles ainda usam o modelo legado de decorators + reflect-metadata, não os Stage-3 decorators).
- Execução em dev/test de TS via loader nativo. Duas opções:
  - **A (recomendada):** `tsx` para dev (`tsx watch`) e testes (`node --import tsx --test`). Simples e rápido.
  - **B:** Node `--experimental-strip-types` — porém **não** transpila `emitDecoratorMetadata`, então **não serve** com decorators. Por isso usamos `tsx` (ou `ts-node`/swc) onde há decorators.
- Build de produção com `tsc` (emite JS + metadata) — runtime roda JS puro, sem loader.

> Importante: como dependemos de `emitDecoratorMetadata`, o transpiler de dev/teste precisa emiti-lo. `tsx` (esbuild) suporta via `tsconfig`. Confirmar no setup que metadata é emitida (teste smoke de DI/TypeORM).

## package.json (alvo)

```jsonc
{
  "name": "vellozap-food-service",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "node --import tsx --test \"test/**/*.test.ts\"",
    "test:unit": "node --import tsx --test \"test/unit/**/*.test.ts\"",
    "test:integration": "node --import tsx --test \"test/integration/**/*.test.ts\"",
    "test:watch": "node --import tsx --test --watch \"test/**/*.test.ts\"",
    "test:coverage": "node --import tsx --test --experimental-test-coverage \"test/**/*.test.ts\"",
    "migration:generate": "typeorm-ts-node-esm migration:generate -d src/infrastructure/config/data-source.ts",
    "migration:create": "typeorm-ts-node-esm migration:create",
    "migration:run": "typeorm-ts-node-esm migration:run -d src/infrastructure/config/data-source.ts",
    "migration:revert": "typeorm-ts-node-esm migration:revert -d src/infrastructure/config/data-source.ts",
    "db:baseline": "tsx scripts/baseline.ts"
  },
  "dependencies": {
    "argon2": "^0.41",
    "axios": "^1.7",
    "class-transformer": "^0.5",
    "class-validator": "^0.14",
    "cookie-parser": "^1.4",
    "cors": "^2.8",
    "date-fns": "^3.6",
    "dotenv": "^16",
    "express": "^4.21",
    "helmet": "^8",
    "jsonwebtoken": "^9",
    "pg": "^8.12",
    "reflect-metadata": "^0.2",
    "routing-controllers": "^0.10",
    "tsyringe": "^4.8",
    "typeorm": "^0.3.20",
    "zod": "^3.23"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4",
    "@types/cors": "^2.8",
    "@types/express": "^4.17",
    "@types/jsonwebtoken": "^9",
    "@types/node": "^22",
    "eslint": "^9",
    "tsx": "^4.19",
    "typescript": "^5.6"
  }
}
```

Notas:
- **Express 4** recomendado para v1 por compatibilidade madura com `routing-controllers` (Express 5 pode exigir ajustes). Reavaliar Express 5 quando `routing-controllers` confirmar suporte estável.
- `class-validator`/`class-transformer` opcionais se preferirmos **zod** como única camada de validação (recomendado: zod nos DTOs; routing-controllers só roteia). Manter zod como fonte de verdade da validação.
- `google-auth-library` adicionada só na fase de login social.

## tsconfig.json (base)

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "types": ["node", "reflect-metadata"],
    "strict": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "outDir": "dist",
    "sourceMap": true,
    "declaration": false
  },
  "include": ["src", "test", "scripts"]
}
```

`tsconfig.build.json` estende e restringe a `src` (exclui `test`).

> Nota ESM + decorators: `import 'reflect-metadata'` deve ser o **primeiro** import em `src/main.ts`. Com `NodeNext`, imports relativos precisam de extensão (`.ts` em dev com tsx / `.js` no output) — padronizar. Alternativa: `module: "ESNext"` + `moduleResolution: "Bundler"` para dispensar extensões em dev; decidir no setup. `strict` + `noUncheckedIndexedAccess` alinham com o padrão de tipagem estrita do repo.

## Variáveis de ambiente (`.env.example`)

```dotenv
# App
NODE_ENV=development
PORT=3333
API_PREFIX=/api
CORS_ORIGIN=http://localhost:8080   # origin do frontend Vite

# Database (mesmo Postgres do Supabase — role de serviço)
DATABASE_URL=postgres://USER:PASS@HOST:5432/postgres
DATABASE_SSL=true
DATABASE_CA_CERT=                    # conteúdo/caminho do CA do Supabase (NÃO desabilitar verificação TLS)
DB_LOGGING=false

# Auth / JWT
JWT_ACCESS_SECRET=change-me-32+chars
JWT_ISSUER=vellozap-food
JWT_AUDIENCE=vellozap-food-frontend
ACCESS_TTL=15m
REFRESH_TTL=30d
# (RS256 opcional)
# JWT_PRIVATE_KEY=
# JWT_PUBLIC_KEY=

# Argon2
ARGON_MEMORY_COST=19456
ARGON_TIME_COST=2
ARGON_PARALLELISM=1

# WhatsApp
WHATSAPP_PROVIDER=evolution         # evolution | n8n
EVOLUTION_API_URL=https://evo.example.com
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=vellozap
EVOLUTION_WEBHOOK_SECRET=
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=

# Storage (logo/imagens — substitui supabase.storage)
STORAGE_DRIVER=local                # local | s3 | supabase
STORAGE_LOCAL_DIR=./uploads
# S3_BUCKET=, S3_REGION=, S3_ACCESS_KEY=, S3_SECRET_KEY=

# External
VIACEP_BASE_URL=https://viacep.com.br/ws

# Social (futuro)
# GOOGLE_CLIENT_ID=
```

Validação de env com **zod** em `infrastructure/config/env.ts` (falha rápida no boot se faltar variável obrigatória). Segredos nunca commitados; `.env` no `.gitignore`.

## Dockerfile (multi-stage)

```dockerfile
# build
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# runtime
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3333
USER node
CMD ["node", "dist/main.js"]
```
> `argon2` é binário nativo; em alpine pode exigir `apk add --no-cache python3 make g++` no estágio de build, ou usar imagem `node:24-slim` (Debian). Validar no setup.

## docker-compose (dev/integração)

```yaml
services:
  api:
    build: .
    env_file: .env
    ports: ["3333:3333"]
    depends_on: [db]
  db:                       # Postgres LOCAL só para dev/testes de integração
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: vellozap
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes: { pgdata: {} }
```
> Em produção o `DATABASE_URL` aponta para o Postgres do Supabase; o serviço `db` do compose é apenas para dev/integração local.

## Hardening HTTP (boot)
- `helmet()`, `cors({ origin: env.CORS_ORIGIN, credentials: true })`, `cookie-parser`.
- `express.json({ limit, verify })` capturando `rawBody` para webhooks.
- Rate limit em rotas sensíveis.
- Healthcheck `GET /health` (sem auth).
