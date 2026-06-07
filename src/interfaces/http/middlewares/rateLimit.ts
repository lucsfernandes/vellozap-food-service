import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import type { Env } from '../../../infrastructure/config/env.js';

interface AuthRateLimiters {
  login: RateLimitRequestHandler;
  refresh: RateLimitRequestHandler;
}

function makeLimiter(windowMs: number, limit: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later.',
        },
      });
    },
  });
}

/**
 * Builds per-IP rate limiters for the sensitive auth endpoints (C2).
 * Limits are env-configurable with sane defaults.
 */
export function createAuthRateLimiters(env: Env): AuthRateLimiters {
  return {
    login: makeLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_LOGIN_MAX),
    refresh: makeLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_REFRESH_MAX),
  };
}
