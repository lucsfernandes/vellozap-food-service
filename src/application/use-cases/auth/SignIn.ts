import { inject, injectable } from 'tsyringe';
import type { IUserAccountRepository, IRefreshTokenRepository } from '../../ports/repositories/IAuthRepositories.js';
import type { IRestaurantRepository } from '../../ports/repositories/IRestaurantRepository.js';
import type { IPasswordHasher } from '../../ports/IPasswordHasher.js';
import type { ITokenService } from '../../ports/ITokenService.js';
import { UnauthorizedError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

export interface SignInInput {
  email: string;
  password: string;
  userAgent?: string | null;
  ip?: string | null;
}

export interface SignInResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: { id: string; email: string };
}

@injectable()
export class SignIn {
  public constructor(
    @inject(TOKENS.UserAccountRepository) private readonly users: IUserAccountRepository,
    @inject(TOKENS.RestaurantRepository) private readonly restaurants: IRestaurantRepository,
    @inject(TOKENS.RefreshTokenRepository) private readonly refreshTokens: IRefreshTokenRepository,
    @inject(TOKENS.PasswordHasher) private readonly hasher: IPasswordHasher,
    @inject(TOKENS.TokenService) private readonly tokens: ITokenService,
  ) {}

  public async execute(input: SignInInput): Promise<SignInResult> {
    const user = await this.users.findByEmail(input.email);
    // Generic message; never reveal whether the email exists.
    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }
    const ok = await this.hasher.verify(user.passwordHash, input.password);
    if (!ok) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const restaurant = await this.restaurants.findByOwnerUserId(user.id);
    const accessPayload = { sub: user.id, role: 'owner' as const };
    const accessToken = this.tokens.signAccess(
      restaurant ? { ...accessPayload, restaurantId: restaurant.id } : accessPayload,
    );
    const refresh = this.tokens.signRefresh();
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: this.tokens.hashRefresh(refresh.token),
      expiresAt: refresh.expiresAt,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
      user: { id: user.id, email: user.email },
    };
  }
}
