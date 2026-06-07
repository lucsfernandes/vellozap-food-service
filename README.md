# vellozap-food-service

REST backend for **VellozapFood** — a restaurant-management SaaS (Brazilian market) with WhatsApp ordering. This service replaces the frontend's direct Supabase access with an authenticated REST API; all authorization that previously lived in Postgres RLS is now enforced in the application layer.

## Tech stack

- **Runtime:** Node.js ≥ 22 (ESM), TypeScript (strict)
- **HTTP:** Express 4 + [routing-controllers](https://github.com/typestack/routing-controllers)
- **DI:** [tsyringe](https://github.com/microsoft/tsyringe) (decorators + `reflect-metadata`)
- **Persistence:** TypeORM + PostgreSQL (`synchronize: false`, explicit migrations)
- **Validation:** zod
- **Auth:** own authenticator — JWT access + opaque refresh (rotation + reuse detection), argon2id hashing
- **WhatsApp:** provider-agnostic (`IMessagingProvider`) with Evolution API and N8N adapters
- **Tests:** native `node:test` + `node:assert/strict` (no Jest/Vitest), run via `@swc-node/register`

## Architecture

Clean Architecture — dependencies always point inward:

```
interfaces (HTTP controllers, webhooks, middlewares)
   → application (use cases, ports, DTOs)
      → domain (entities, value objects, domain services, errors)
         ← infrastructure implements the ports (TypeORM repos, providers, auth, config, DI)
```

Repositories return **domain models**, never raw TypeORM entities. Money is handled as **integer BRL cents** end-to-end. See `.claude/plan/` for the full design (overview, architecture, data model, auth, API contract, WhatsApp, testing, setup, roadmap).

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the secrets
npm run dev            # tsx/swc watch on src/main.ts
```

A local Postgres for development/integration tests is provided via Docker:

```bash
docker compose up -d db   # Postgres on host port 5433
```

### Database / migrations

`synchronize` is **never** enabled. The schema is managed by explicit migrations:

```bash
npm run migration:run       # apply pending migrations
npm run migration:revert    # roll back the last migration
npm run migration:generate  # generate a migration from entity changes
```

The first migration is an **idempotent baseline** (`CREATE TABLE IF NOT EXISTS`) describing the original tables; subsequent migrations are additive. `scripts/baseline.ts` stamps the baseline as already-applied for a database whose tables already exist (do **not** stamp an empty database — run the migrations instead).

> **TLS to managed Postgres (e.g. Supabase):** set `DATABASE_SSL=true` and provide the provider's CA in `DATABASE_CA_CERT` (PEM content). Never disable certificate verification.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the API in watch mode |
| `npm run build` | Production build with `tsc` |
| `npm start` | Run the compiled server (`dist/main.js`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the full test suite |
| `npm run test:unit` / `test:integration` | Run a subset |
| `npm run migration:run` / `migration:revert` / `migration:generate` | Migrations |

## Configuration

All configuration is via environment variables, validated with zod at boot (`src/infrastructure/config/env.ts`). See `.env.example` for the full list (app, database, JWT/argon2, WhatsApp providers, storage, rate limiting). Secrets live only in a git-ignored `.env`.

## Testing

```bash
npm test                # unit + integration + contract
npm run test:unit       # use cases & domain (no DB/network)
npm run test:integration  # boots the app against a local Postgres
```

Integration tests require the Docker Postgres above. Cross-tenant authorization tests assert that a restaurant owner can never read or mutate another restaurant's data.
