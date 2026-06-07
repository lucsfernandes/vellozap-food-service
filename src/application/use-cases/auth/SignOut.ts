import { inject, injectable } from 'tsyringe';
import type { IRefreshTokenRepository } from '../../ports/repositories/IAuthRepositories.js';
import type { ITokenService } from '../../ports/ITokenService.js';
import type { IClock } from '../../ports/IClock.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

@injectable()
export class SignOut {
  public constructor(
    @inject(TOKENS.RefreshTokenRepository) private readonly refreshTokens: IRefreshTokenRepository,
    @inject(TOKENS.TokenService) private readonly tokens: ITokenService,
    @inject(TOKENS.Clock) private readonly clock: IClock,
  ) {}

  /** Revokes the presented refresh token if found. Idempotent. */
  public async execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const record = await this.refreshTokens.findByHash(this.tokens.hashRefresh(refreshToken));
    if (record && !record.revokedAt) {
      await this.refreshTokens.revoke(record.id, this.clock.now());
    }
  }
}
