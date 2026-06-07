import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { injectable } from 'tsyringe';
import type {
  AccessTokenPayload,
  IssuedRefreshToken,
  ITokenService,
} from '../../application/ports/ITokenService.js';
import { UnauthorizedError } from '../../domain/errors/index.js';
import { APP_ROLES, type AppRole } from '../../domain/enums/index.js';
import { loadEnv } from '../config/env.js';

/** Parses a duration string (`15m`, `30d`, `3600s`, `2h`) into seconds. */
export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit] ?? 1);
}

function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as ReadonlyArray<string>).includes(value);
}

@injectable()
export class JwtTokenService implements ITokenService {
  private readonly accessSecret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  public constructor() {
    const env = loadEnv();
    this.accessSecret = env.JWT_ACCESS_SECRET;
    this.issuer = env.JWT_ISSUER;
    this.audience = env.JWT_AUDIENCE;
    this.accessTtlSeconds = parseDurationToSeconds(env.ACCESS_TTL);
    this.refreshTtlSeconds = parseDurationToSeconds(env.REFRESH_TTL);
  }

  public signAccess(payload: AccessTokenPayload): string {
    const claims: Record<string, unknown> = { role: payload.role };
    if (payload.restaurantId !== undefined) {
      claims['restaurantId'] = payload.restaurantId;
    }
    return jwt.sign(claims, this.accessSecret, {
      subject: payload.sub,
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: this.accessTtlSeconds,
      algorithm: 'HS256',
    });
  }

  public signRefresh(): IssuedRefreshToken {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);
    return { token, expiresAt };
  }

  public verifyAccess(token: string): AccessTokenPayload {
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(token, this.accessSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
    if (typeof decoded === 'string' || !decoded.sub || !isAppRole(decoded['role'])) {
      throw new UnauthorizedError('Malformed access token');
    }
    const restaurantId = decoded['restaurantId'];
    const result: AccessTokenPayload = { sub: decoded.sub, role: decoded['role'] };
    if (typeof restaurantId === 'string') {
      result.restaurantId = restaurantId;
    }
    return result;
  }

  public hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
