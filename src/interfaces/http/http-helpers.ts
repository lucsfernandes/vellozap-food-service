import type { Request, Response } from 'express';
import { loadEnv } from '../../infrastructure/config/env.js';

export const REFRESH_COOKIE = 'vz_refresh';

/** Sets the httpOnly refresh cookie. */
export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  const env = loadEnv();
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/',
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

/** Reads the refresh token from cookie or body. */
export function readRefreshToken(req: Request, bodyToken?: string): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[REFRESH_COOKIE] ?? bodyToken;
}

export function requestMeta(req: Request): { userAgent: string | null; ip: string | null } {
  const ua = req.headers['user-agent'];
  return {
    userAgent: typeof ua === 'string' ? ua : null,
    ip: req.ip ?? null,
  };
}
