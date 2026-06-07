import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : v.trim().toLowerCase() === 'true'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  API_PREFIX: z.string().default('/api'),
  CORS_ORIGIN: z.string().default('http://localhost:8080'),
  /**
   * Number of reverse proxies in front of the app (Express `trust proxy`).
   * 0 = no proxy (use socket IP); set to the proxy hop count in production so
   * the rate limiter keys on the real client IP from `X-Forwarded-For`.
   */
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),

  // ---- Rate limiting (auth routes) ----
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  /** Max POST /auth/login attempts per window per IP. */
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
  /** Max POST /auth/refresh attempts per window per IP. */
  RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().positive().default(30),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: booleanFromString.default(false),
  DATABASE_CA_CERT: z.string().optional(),
  DB_LOGGING: booleanFromString.default(false),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_ISSUER: z.string().default('vellozap-food'),
  JWT_AUDIENCE: z.string().default('vellozap-food-frontend'),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL: z.string().default('30d'),

  ARGON_MEMORY_COST: z.coerce.number().int().positive().default(19456),
  ARGON_TIME_COST: z.coerce.number().int().positive().default(2),
  ARGON_PARALLELISM: z.coerce.number().int().positive().default(1),

  WHATSAPP_PROVIDER: z.enum(['evolution', 'n8n']).default('evolution'),
  EVOLUTION_API_URL: z.string().default(''),
  EVOLUTION_API_KEY: z.string().default(''),
  EVOLUTION_INSTANCE: z.string().default('vellozap'),
  EVOLUTION_WEBHOOK_SECRET: z.string().default(''),
  N8N_WEBHOOK_URL: z.string().default(''),
  N8N_WEBHOOK_SECRET: z.string().default(''),

  STORAGE_DRIVER: z.enum(['local', 's3', 'supabase']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  STORAGE_PUBLIC_BASE_URL: z.string().default('http://localhost:3333/uploads'),

  VIACEP_BASE_URL: z.string().default('https://viacep.com.br/ws'),
}).superRefine((env, ctx) => {
  // Fail CLOSED in production: a webhook secret is mandatory for the active
  // provider so inbound webhook signatures cannot silently fail-open. See H1.
  if (env.NODE_ENV !== 'production') {
    return;
  }
  if (env.WHATSAPP_PROVIDER === 'evolution' && env.EVOLUTION_API_URL && !env.EVOLUTION_WEBHOOK_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['EVOLUTION_WEBHOOK_SECRET'],
      message: 'EVOLUTION_WEBHOOK_SECRET is required in production',
    });
  }
  if (env.WHATSAPP_PROVIDER === 'n8n' && env.N8N_WEBHOOK_URL && !env.N8N_WEBHOOK_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['N8N_WEBHOOK_SECRET'],
      message: 'N8N_WEBHOOK_SECRET is required in production',
    });
  }
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Parses and caches process.env. Fails fast on boot when a required var is missing. */
export function loadEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test/utility hook to override env between runs. */
export function resetEnvCache(): void {
  cached = null;
}
