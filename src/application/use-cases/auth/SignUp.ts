import { inject, injectable } from 'tsyringe';
import type { IUserAccountRepository, IRefreshTokenRepository } from '../../ports/repositories/IAuthRepositories.js';
import type { IPasswordHasher } from '../../ports/IPasswordHasher.js';
import type { ITokenService } from '../../ports/ITokenService.js';
import { ConflictError } from '../../../domain/errors/index.js';
import { toRestaurantDTO, type RestaurantDTO } from '../../dtos/mappers.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

export interface SignUpInput {
  email: string;
  password: string;
  restaurantName: string;
  userAgent?: string | null;
  ip?: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: { id: string; email: string };
  restaurant: RestaurantDTO;
}

@injectable()
export class SignUp {
  public constructor(
    @inject(TOKENS.UserAccountRepository) private readonly users: IUserAccountRepository,
    @inject(TOKENS.RefreshTokenRepository) private readonly refreshTokens: IRefreshTokenRepository,
    @inject(TOKENS.PasswordHasher) private readonly hasher: IPasswordHasher,
    @inject(TOKENS.TokenService) private readonly tokens: ITokenService,
  ) {}

  public async execute(input: SignUpInput): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await this.hasher.hash(input.password);
    // Atomic: user_account + auth_identity + restaurant_profile in one DB
    // transaction so a partial failure cannot orphan an account (M3).
    const { user, restaurant } = await this.users.createUserWithRestaurant({
      email: input.email,
      passwordHash,
      identitySubject: input.email.toLowerCase(),
      restaurantName: input.restaurantName,
    });

    const accessToken = this.tokens.signAccess({
      sub: user.id,
      role: 'owner',
      restaurantId: restaurant.id,
    });
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
      restaurant: toRestaurantDTO(restaurant),
    };
  }
}
