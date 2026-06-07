import type { IPasswordHasher } from '../../../src/application/ports/IPasswordHasher.js';

/** Deterministic non-cryptographic hasher for fast unit tests. */
export class FakePasswordHasher implements IPasswordHasher {
  public async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  public async verify(hash: string, plain: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}
