# 03 — Autenticação (Authenticator próprio JWT) e Autorização

## Objetivos
- Substituir Supabase Auth por authenticator próprio: signup/login/refresh/logout com JWT.
- **Access token** curto (stateless) + **refresh token** longo (stateful, revogável).
- Hashing de senha com **argon2id** (preferido) — fallback documentado para bcrypt.
- Abstração de provider de identidade para **plugar Google** depois sem refazer o core.
- RBAC: papéis `owner` (dono do restaurante) e `employee` (funcionário) + endpoints públicos (menu/checkout).

## Ports (interfaces de aplicação)

```ts
// application/ports/ITokenService.ts
export interface AccessTokenPayload { sub: string; role: AppRole; restaurantId?: string; }
export interface ITokenService {
  signAccess(payload: AccessTokenPayload): string;          // exp curto (ex.: 15m)
  signRefresh(userId: string): { token: string; jti: string; expiresAt: Date }; // opaco/JWT
  verifyAccess(token: string): AccessTokenPayload;          // throws UnauthorizedError
  hashRefresh(token: string): string;                       // sha256 p/ armazenar
}

// application/ports/IPasswordHasher.ts
export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

// application/ports/IIdentityProvider.ts  (extensão social)
export interface ExternalIdentity { provider: 'google'; subject: string; email: string; name?: string; }
export interface IIdentityProvider {
  readonly provider: 'google';
  verifyToken(idToken: string): Promise<ExternalIdentity>;  // valida no IdP
}
```

`AppRole = 'owner' | 'employee'`.

## Fluxos

### SignUp (`POST /api/auth/signup`)
1. Valida body (zod): `email`, `password (min 6)`, `restaurantName`.
2. `IUserAccountRepository.findByEmail` → se existe, `ConflictError` 409.
3. `IPasswordHasher.hash(password)` (argon2id).
4. Cria `user_accounts` + `auth_identities(provider='password', subject=email)`.
5. Cria `restaurant_profiles` com `user_id = user.id`, `restaurant_name`, `onboarding_completed=false`.
6. Emite access + refresh; persiste hash do refresh em `refresh_tokens`.
7. Retorna `{ accessToken, user, restaurant }` e seta refresh em **cookie httpOnly Secure SameSite=strict** (recomendado) ou no body para mobile.

### SignIn (`POST /api/auth/login`)
1. Valida body. Busca usuário por email; se inexistente ou `password_hash` null → `UnauthorizedError` (mensagem genérica, sem revelar existência).
2. `verify(hash, password)`; em falha → 401.
3. Emite tokens, persiste refresh.

### Refresh (`POST /api/auth/refresh`)
1. Lê refresh (cookie ou body). `hashRefresh` e busca em `refresh_tokens` por hash.
2. Se não encontrado / `revoked_at` / `expires_at < now` → 401.
3. **Rotação**: revoga o refresh atual (`revoked_at=now`) e emite um novo (token rotation) — mitiga replay. Detecção de reuse: se um refresh já revogado for reapresentado, revogar **toda** a família do usuário.
4. Emite novo access.

### SignOut (`POST /api/auth/logout`)
- Revoga o refresh apresentado (`revoked_at=now`). Opcional: revogar todos do usuário ("logout de todos os dispositivos").

### GetCurrentUser (`GET /api/auth/me`)
- Lê access token, retorna `{ user, restaurant, roles }`.

## Hashing
- **argon2id** via `argon2` (memória/tempo configuráveis por env). Preferido pela resistência a GPU.
- Parâmetros sugeridos: `memoryCost=19456 (19MB)`, `timeCost=2`, `parallelism=1` (ajustar por benchmark do host).
- Alternativa: `bcrypt` cost 12 — documentado caso argon2 (binário nativo) seja problema no host.
- Refresh tokens: armazenar **apenas o hash sha256** do token; nunca o valor cru.

## JWT
- Access: assinado com `JWT_ACCESS_SECRET` (HS256) ou par RS256 (`JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`) — RS256 recomendado se houver múltiplos serviços verificando. Claims: `sub`, `role`, `restaurantId`, `iat`, `exp`, `iss`, `aud`.
- Refresh: pode ser opaco (random 256-bit) + registro no banco — mais simples de revogar. Recomendado opaco.
- TTLs por env: `ACCESS_TTL=15m`, `REFRESH_TTL=30d`.

## Guards / Middleware (routing-controllers + tsyringe)

### authorizationChecker (RBAC)
```ts
// interfaces/http/auth/authorizationChecker.ts
export function makeAuthorizationChecker(container: DependencyContainer): AuthorizationChecker {
  return async (action, roles: AppRole[]) => {
    const token = extractBearer(action.request);          // Authorization: Bearer
    if (!token) return false;
    const tokenService = container.resolve<ITokenService>(TOKENS.TokenService);
    try {
      const payload = tokenService.verifyAccess(token);
      action.request.authUser = payload;                  // anexa p/ currentUserChecker
      if (!roles || roles.length === 0) return true;      // só exige autenticado
      return roles.includes(payload.role);
    } catch { return false; }                             // → 401 pelo defaultErrorHandler off
  };
}
```

### currentUserChecker
```ts
export function makeCurrentUserChecker(): CurrentUserChecker {
  return async (action) => action.request.authUser as AuthUser | undefined;
}
```

### Uso nos controllers
```ts
@Authorized(['owner'])                  // exige role owner
@Authorized()                           // exige apenas autenticação
// endpoints públicos: sem @Authorized (ex.: PublicMenuController, WhatsAppWebhookController)
```

## Migração da lógica de RLS atual → policies de aplicação

As políticas RLS existentes e seus equivalentes na aplicação:

| Política RLS (hoje) | Regra | Equivalente na aplicação |
|---|---|---|
| `restaurant_profiles`: `auth.uid() = user_id` | dono só vê/edita o próprio | Use cases recebem `userId` do token; repositório filtra `where user_id = :userId`. `GetMyRestaurant`/`UpdateRestaurantProfile` nunca aceitam `restaurantId` arbitrário. |
| `onboarding_progress`: `auth.uid() = user_id` (select/insert/update) | idem | `IOnboardingRepository` sempre escopado por `userId` do token. |
| `products`/`orders`/`employees`/`operating_hours` (FK restaurant → owner) | acesso via dono do restaurante | **Ownership guard**: middleware/serviço `assertRestaurantOwnership(userId, restaurantId)` antes de qualquer mutação. Repositórios recebem `restaurantId` resolvido a partir do `userId` (não confiar em `restaurantId` vindo do cliente). |
| `employee_work_records`/`employee_payments`: EXISTS join employees→restaurant_profiles→`auth.uid()` | dono gerencia registros dos seus funcionários | Use case resolve `employee_id` → `restaurant_id` → confirma `ownerUserId === token.sub`; senão `ForbiddenError`. |

**Padrão central**: um serviço `RestaurantContextResolver` resolve, a partir do `userId` do token, o `restaurantId` do dono, e todo use case de owner opera dentro desse escopo. Para `employee`, o token carrega `restaurantId` e `role='employee'` e o RBAC limita as ações.

> Defesa em profundidade: como abrimos mão do RLS na conexão de serviço, **todos** os repositórios de recursos por-restaurante exigem `restaurantId` como parâmetro obrigatório, e há testes de autorização (ver `06`) que tentam acessar recurso de outro restaurante e esperam 403/404.

## Ponto de extensão para login social (Google) — sem refazer

1. Tabela `auth_identities` já permite N métodos por `user_account`.
2. `IIdentityProvider` (ex.: `GoogleIdentityProvider` usando `google-auth-library` para validar o `id_token`).
3. Novo use case `SignInWithGoogle`:
   - `verifyToken(idToken)` → `{ provider:'google', subject, email }`.
   - Procura `auth_identities(provider='google', subject)`. Se existe → emite tokens.
   - Senão, procura `user_accounts` por email: se existe, **vincula** nova identidade; se não, cria `user_account` (sem `password_hash`) + identidade + (opcional) restaurant_profile.
4. Novo endpoint `POST /api/auth/oauth/google` — **não exige** alterar o core de tokens nem o RBAC; reusa `ITokenService` e o fluxo de emissão/refresh já existente.

## Segurança operacional
- Rate limit em `/auth/login` e `/auth/refresh` (middleware).
- Mensagens de erro genéricas em login (não revelar se email existe).
- Cookies de refresh `httpOnly; Secure; SameSite=Strict`; CORS restrito à origin do frontend.
- Segredos só via env (ver `07`); rotação de `JWT_ACCESS_SECRET` suportada por `kid` se RS256.
