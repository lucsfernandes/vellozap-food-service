import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignIn } from '../../../../src/application/use-cases/auth/SignIn.js';
import { UnauthorizedError } from '../../../../src/domain/errors/index.js';
import {
  InMemoryRefreshTokenRepository,
  InMemoryUserAccountRepository,
} from '../../../helpers/fakes/InMemoryAuthRepositories.js';
import { InMemoryRestaurantRepository } from '../../../helpers/fakes/InMemoryRestaurantRepository.js';
import { FakePasswordHasher } from '../../../helpers/fakes/FakePasswordHasher.js';
import { FakeTokenService } from '../../../helpers/fakes/FakeTokenService.js';

async function setup() {
  const users = new InMemoryUserAccountRepository();
  const restaurants = new InMemoryRestaurantRepository();
  const refresh = new InMemoryRefreshTokenRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const user = await users.create({ email: 'dono@teste.com', passwordHash: await hasher.hash('secret123') });
  restaurants.seed({ userId: user.id });
  const useCase = new SignIn(users, restaurants, refresh, hasher, tokens);
  return { useCase, refresh, user };
}

test('returns tokens for valid credentials and persists a refresh token', async () => {
  const { useCase, refresh } = await setup();
  const result = await useCase.execute({ email: 'dono@teste.com', password: 'secret123' });
  assert.equal(typeof result.accessToken, 'string');
  assert.equal(typeof result.refreshToken, 'string');
  assert.equal(refresh.items.size, 1);
});

test('rejects wrong password with generic UnauthorizedError', async () => {
  const { useCase } = await setup();
  await assert.rejects(
    () => useCase.execute({ email: 'dono@teste.com', password: 'wrong' }),
    UnauthorizedError,
  );
});

test('rejects unknown email without revealing existence', async () => {
  const { useCase } = await setup();
  await assert.rejects(
    () => useCase.execute({ email: 'ghost@teste.com', password: 'secret123' }),
    UnauthorizedError,
  );
});
