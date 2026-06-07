import { createHash, randomBytes } from 'node:crypto';
import type {
  AccessTokenPayload,
  IssuedRefreshToken,
  ITokenService,
} from '../../../src/application/ports/ITokenService.js';
import { UnauthorizedError } from '../../../src/domain/errors/index.js';

/** Deterministic in-memory token service. Access token is a base64 JSON blob. */
export class FakeTokenService implements ITokenService {
  public refreshTtlMs = 1000 * 60 * 60 * 24 * 30;

  public signAccess(payload: AccessTokenPayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  public signRefresh(): IssuedRefreshToken {
    return {
      token: randomBytes(16).toString('hex'),
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
    };
  }

  public verifyAccess(token: string): AccessTokenPayload {
    try {
      return JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid token');
    }
  }

  public hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
