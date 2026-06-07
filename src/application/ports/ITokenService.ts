import type { AppRole } from '../../domain/enums/index.js';

export interface AccessTokenPayload {
  sub: string;
  role: AppRole;
  restaurantId?: string;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export interface ITokenService {
  /** Signs a short-lived access JWT. */
  signAccess(payload: AccessTokenPayload): string;
  /** Generates an opaque random refresh token + its expiry. */
  signRefresh(): IssuedRefreshToken;
  /** Verifies and decodes an access token; throws UnauthorizedError on failure. */
  verifyAccess(token: string): AccessTokenPayload;
  /** sha256 hash of a refresh token for at-rest storage. */
  hashRefresh(token: string): string;
}
