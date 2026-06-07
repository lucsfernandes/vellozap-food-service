import { randomUUID } from 'node:crypto';
import type {
  CreateUserWithRestaurantInput,
  IRefreshTokenRepository,
  IUserAccountRepository,
} from '../../../src/application/ports/repositories/IAuthRepositories.js';
import type { AuthIdentity, NewUserAccount, UserAccount } from '../../../src/domain/entities/auth/UserAccount.js';
import type { Restaurant } from '../../../src/domain/entities/Restaurant.js';
import type {
  NewRefreshTokenRecord,
  RefreshTokenRecord,
} from '../../../src/domain/entities/auth/RefreshTokenRecord.js';
import type { InMemoryRestaurantRepository } from './InMemoryRestaurantRepository.js';

export class InMemoryUserAccountRepository implements IUserAccountRepository {
  public readonly users = new Map<string, UserAccount>();
  public readonly identities = new Map<string, AuthIdentity>();

  /**
   * Optional restaurant repo so {@link createUserWithRestaurant} can create the
   * profile. The fake performs the writes sequentially (no real transaction);
   * tests can inject a failing repo to exercise the rollback contract (M3).
   */
  public constructor(private readonly restaurants?: InMemoryRestaurantRepository) {}

  public async findByEmail(email: string): Promise<UserAccount | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  public async findById(id: string): Promise<UserAccount | null> {
    return this.users.get(id) ?? null;
  }

  public async create(data: NewUserAccount): Promise<UserAccount> {
    const now = new Date();
    const u: UserAccount = {
      id: data.id ?? randomUUID(),
      email: data.email,
      passwordHash: data.passwordHash ?? null,
      displayName: data.displayName ?? null,
      isActive: true,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(u.id, u);
    return u;
  }

  public async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    const u = this.users.get(id);
    if (u) this.users.set(id, { ...u, passwordHash });
  }

  public async findIdentity(provider: AuthIdentity['provider'], subject: string): Promise<AuthIdentity | null> {
    for (const i of this.identities.values()) {
      if (i.provider === provider && i.providerSubject === subject) return i;
    }
    return null;
  }

  public async createIdentity(
    userId: string,
    provider: AuthIdentity['provider'],
    subject: string,
  ): Promise<AuthIdentity> {
    const i: AuthIdentity = { id: randomUUID(), userId, provider, providerSubject: subject, createdAt: new Date() };
    this.identities.set(i.id, i);
    return i;
  }

  public async createUserWithRestaurant(
    input: CreateUserWithRestaurantInput,
  ): Promise<{ user: UserAccount; restaurant: Restaurant }> {
    if (!this.restaurants) {
      throw new Error('InMemoryUserAccountRepository requires a restaurant repo for createUserWithRestaurant');
    }
    // Sequential writes (no real DB transaction). If the restaurant write throws,
    // roll back the user/identity so the fake mirrors the transactional contract.
    const user = await this.create({ email: input.email, passwordHash: input.passwordHash });
    await this.createIdentity(user.id, 'password', input.identitySubject);
    try {
      const restaurant = await this.restaurants.create({
        userId: user.id,
        restaurantName: input.restaurantName,
      });
      return { user, restaurant };
    } catch (err) {
      this.users.delete(user.id);
      for (const [id, identity] of this.identities.entries()) {
        if (identity.userId === user.id) {
          this.identities.delete(id);
        }
      }
      throw err;
    }
  }
}

export class InMemoryRefreshTokenRepository implements IRefreshTokenRepository {
  public readonly items = new Map<string, RefreshTokenRecord>();

  public async create(data: NewRefreshTokenRecord): Promise<RefreshTokenRecord> {
    const rec: RefreshTokenRecord = {
      id: randomUUID(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      createdAt: new Date(),
      userAgent: data.userAgent ?? null,
      ip: data.ip ?? null,
    };
    this.items.set(rec.id, rec);
    return rec;
  }

  public async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    for (const r of this.items.values()) {
      if (r.tokenHash === tokenHash) return r;
    }
    return null;
  }

  public async revoke(id: string, revokedAt: Date): Promise<void> {
    const r = this.items.get(id);
    if (r) this.items.set(id, { ...r, revokedAt });
  }

  public async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    for (const [id, r] of this.items.entries()) {
      if (r.userId === userId && !r.revokedAt) {
        this.items.set(id, { ...r, revokedAt });
      }
    }
  }
}
