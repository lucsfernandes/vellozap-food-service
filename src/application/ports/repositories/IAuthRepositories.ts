import type {
  AuthIdentity,
  NewUserAccount,
  UserAccount,
} from '../../../domain/entities/auth/UserAccount.js';
import type {
  NewRefreshTokenRecord,
  RefreshTokenRecord,
} from '../../../domain/entities/auth/RefreshTokenRecord.js';
import type { Restaurant } from '../../../domain/entities/Restaurant.js';

/** Input for the transactional signup unit-of-work. */
export interface CreateUserWithRestaurantInput {
  email: string;
  passwordHash: string;
  /** Identity subject (typically the lowercased email) for the `password` provider. */
  identitySubject: string;
  restaurantName: string;
}

export interface IUserAccountRepository {
  findByEmail(email: string): Promise<UserAccount | null>;
  findById(id: string): Promise<UserAccount | null>;
  create(data: NewUserAccount): Promise<UserAccount>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  findIdentity(provider: AuthIdentity['provider'], subject: string): Promise<AuthIdentity | null>;
  createIdentity(userId: string, provider: AuthIdentity['provider'], subject: string): Promise<AuthIdentity>;
  /**
   * Creates the user_account, its `password` auth_identity, and the
   * restaurant_profile atomically in a single DB transaction (M3). A partial
   * failure rolls back entirely so no orphaned account blocks re-signup.
   */
  createUserWithRestaurant(
    input: CreateUserWithRestaurantInput,
  ): Promise<{ user: UserAccount; restaurant: Restaurant }>;
}

export interface IRefreshTokenRepository {
  create(data: NewRefreshTokenRecord): Promise<RefreshTokenRecord>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revoke(id: string, revokedAt: Date): Promise<void>;
  /** Revokes every non-revoked token of a user (reuse detection / logout-all). */
  revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
}
