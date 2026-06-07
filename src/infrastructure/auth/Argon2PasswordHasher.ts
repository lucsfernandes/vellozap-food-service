import argon2 from 'argon2';
import { injectable } from 'tsyringe';
import type { IPasswordHasher } from '../../application/ports/IPasswordHasher.js';
import { loadEnv } from '../config/env.js';

/** argon2id password hasher with parameters configurable via env. */
@injectable()
export class Argon2PasswordHasher implements IPasswordHasher {
  private readonly options: argon2.Options;

  public constructor() {
    const env = loadEnv();
    this.options = {
      type: argon2.argon2id,
      memoryCost: env.ARGON_MEMORY_COST,
      timeCost: env.ARGON_TIME_COST,
      parallelism: env.ARGON_PARALLELISM,
    };
  }

  public async hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  public async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
