import { inject, injectable } from 'tsyringe';
import type { IUserAccountRepository, IRefreshTokenRepository } from '../../ports/repositories/IAuthRepositories.js';
import type { IRestaurantRepository } from '../../ports/repositories/IRestaurantRepository.js';
import type { ITokenService } from '../../ports/ITokenService.js';
import type { IClock } from '../../ports/IClock.js';
import { UnauthorizedError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

export interface RefreshInput {
  refreshToken: string;
  userAgent?: string | null;
  ip?: string | null;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Rotates the refresh token. On presentation of an already-revoked token
 * (reuse), revokes the entire token family for the user (reuse detection).
 */
@injectable()
export class RefreshTokens {
  public constructor(
    @inject(TOKENS.RefreshTokenRepository) private readonly refreshTokens: IRefreshTokenRepository,
    @inject(TOKENS.UserAccountRepository) private readonly users: IUserAccountRepository,
    @inject(TOKENS.RestaurantRepository) private readonly restaurants: IRestaurantRepository,
    @inject(TOKENS.TokenService) private readonly tokens: ITokenService,
    @inject(TOKENS.Clock) private readonly clock: IClock,
  ) {}

  public async execute(input: RefreshInput): Promise<RefreshResult> {
    const now = this.clock.now();
    const tokenHash = this.tokens.hashRefresh(input.refreshToken);
    const record = await this.refreshTokens.findByHash(tokenHash);

    if (!record) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Reuse detection: a revoked token being presented again ⇒ compromise.
    if (record.revokedAt) {
      await this.refreshTokens.revokeAllForUser(record.userId, now);
      throw new UnauthorizedError('Refresh token reuse detected');
    }

    if (record.expiresAt.getTime() <= now.getTime()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    // Rotate: revoke current, issue a new one.
    await this.refreshTokens.revoke(record.id, now);
    const refresh = this.tokens.signRefresh();
    await this.refreshTokens.create({
      userId: record.userId,
      tokenHash: this.tokens.hashRefresh(refresh.token),
      expiresAt: refresh.expiresAt,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    });

    const user = await this.users.findById(record.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account is not active');
    }
    const restaurant = await this.restaurants.findByOwnerUserId(user.id);
    const base = { sub: user.id, role: 'owner' as const };
    const accessToken = this.tokens.signAccess(
      restaurant ? { ...base, restaurantId: restaurant.id } : base,
    );

    return { accessToken, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt };
  }
}
