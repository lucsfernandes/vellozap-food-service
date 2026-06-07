import type { DataSource, Repository } from 'typeorm';
import { inject, injectable } from 'tsyringe';
import type {
  CreateUserWithRestaurantInput,
  IUserAccountRepository,
} from '../../../application/ports/repositories/IAuthRepositories.js';
import type { AuthIdentity, NewUserAccount, UserAccount } from '../../../domain/entities/auth/UserAccount.js';
import type { Restaurant } from '../../../domain/entities/Restaurant.js';
import { TOKENS } from '../../di/tokens.js';
import { AuthIdentityEntity } from '../entities/AuthIdentityEntity.js';
import { RestaurantProfileEntity } from '../entities/RestaurantProfileEntity.js';
import { UserAccountEntity } from '../entities/UserAccountEntity.js';

function restaurantToDomain(e: RestaurantProfileEntity): Restaurant {
  return {
    id: e.id,
    userId: e.userId,
    restaurantName: e.restaurantName,
    phone: e.phone,
    address: e.address,
    logoUrl: e.logoUrl,
    responsibleName: e.responsibleName,
    cnpj: e.cnpj,
    email: e.email,
    deliveryType: e.deliveryType,
    whatsappNumber: e.whatsappNumber,
    deliveryRadius: e.deliveryRadius,
    onboardingCompleted: e.onboardingCompleted,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function userToDomain(e: UserAccountEntity): UserAccount {
  return {
    id: e.id,
    email: e.email,
    passwordHash: e.passwordHash,
    displayName: e.displayName,
    isActive: e.isActive,
    emailVerified: e.emailVerified,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function identityToDomain(e: AuthIdentityEntity): AuthIdentity {
  return {
    id: e.id,
    userId: e.userId,
    provider: e.provider as AuthIdentity['provider'],
    providerSubject: e.providerSubject,
    createdAt: e.createdAt,
  };
}

@injectable()
export class TypeOrmUserAccountRepository implements IUserAccountRepository {
  private readonly repo: Repository<UserAccountEntity>;
  private readonly identityRepo: Repository<AuthIdentityEntity>;

  public constructor(@inject(TOKENS.DataSource) private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(UserAccountEntity);
    this.identityRepo = dataSource.getRepository(AuthIdentityEntity);
  }

  public async findByEmail(email: string): Promise<UserAccount | null> {
    const e = await this.repo
      .createQueryBuilder('u')
      .where('lower(u.email) = lower(:email)', { email })
      .getOne();
    return e ? userToDomain(e) : null;
  }

  public async findById(id: string): Promise<UserAccount | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? userToDomain(e) : null;
  }

  public async create(data: NewUserAccount): Promise<UserAccount> {
    const entity = this.repo.create({
      ...(data.id !== undefined ? { id: data.id } : {}),
      email: data.email,
      passwordHash: data.passwordHash ?? null,
      displayName: data.displayName ?? null,
    });
    const saved = await this.repo.save(entity);
    return userToDomain(saved);
  }

  public async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.repo.update({ id }, { passwordHash });
  }

  public async findIdentity(
    provider: AuthIdentity['provider'],
    subject: string,
  ): Promise<AuthIdentity | null> {
    const e = await this.identityRepo.findOne({ where: { provider, providerSubject: subject } });
    return e ? identityToDomain(e) : null;
  }

  public async createIdentity(
    userId: string,
    provider: AuthIdentity['provider'],
    subject: string,
  ): Promise<AuthIdentity> {
    const entity = this.identityRepo.create({ userId, provider, providerSubject: subject });
    const saved = await this.identityRepo.save(entity);
    return identityToDomain(saved);
  }

  public async createUserWithRestaurant(
    input: CreateUserWithRestaurantInput,
  ): Promise<{ user: UserAccount; restaurant: Restaurant }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const manager = queryRunner.manager;

      const userEntity = manager.create(UserAccountEntity, {
        email: input.email,
        passwordHash: input.passwordHash,
      });
      const savedUser = await manager.save(userEntity);

      const identityEntity = manager.create(AuthIdentityEntity, {
        userId: savedUser.id,
        provider: 'password',
        providerSubject: input.identitySubject,
      });
      await manager.save(identityEntity);

      const restaurantEntity = manager.create(RestaurantProfileEntity, {
        userId: savedUser.id,
        restaurantName: input.restaurantName,
        onboardingCompleted: false,
      });
      const savedRestaurant = await manager.save(restaurantEntity);

      await queryRunner.commitTransaction();
      return { user: userToDomain(savedUser), restaurant: restaurantToDomain(savedRestaurant) };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
