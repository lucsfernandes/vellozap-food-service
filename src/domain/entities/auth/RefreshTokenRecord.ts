/** Domain model mirroring `refresh_tokens`. Stores only the sha256 hash of the token. */
export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  userAgent: string | null;
  ip: string | null;
}

export interface NewRefreshTokenRecord {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
}
