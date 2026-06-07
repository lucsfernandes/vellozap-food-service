import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignUp } from '../../../../src/application/use-cases/auth/SignUp.js';
import { ConflictError } from '../../../../src/domain/errors/index.js';
import {
  InMemoryRefreshTokenRepository,
  InMemoryUserAccountRepository,
} from '../../../helpers/fakes/InMemoryAuthRepositories.js';
import { InMemoryRestaurantRepository } from '../../../helpers/fakes/InMemoryRestaurantRepository.js';
import { FakePasswordHasher } from '../../../helpers/fakes/FakePasswordHasher.js';
import { FakeTokenService } from '../../../helpers/fakes/FakeTokenService.js';

function setup(restaurants = new InMemoryRestaurantRepository()) {
  const users = new InMemoryUserAccountRepository(restaurants);
  const refresh = new InMemoryRefreshTokenRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService();
  const useCase = new SignUp(users, refresh, hasher, tokens);
  return { useCase, users, restaurants, refresh };
}

test('creates user, identity and restaurant and issues tokens', async () => {
  const { useCase, users, restaurants, refresh } = setup();
  const result = await useCase.execute({
    email: 'Dono@Teste.com',
    password: 'secret123',
    restaurantName: 'Pizzaria do Zé',
  });

  assert.equal(typeof result.accessToken, 'string');
  assert.equal(typeof result.refreshToken, 'string');
  assert.equal(result.user.email, 'Dono@Teste.com');
  assert.equal(result.restaurant.restaurant_name, 'Pizzaria do Zé');
  assert.equal(users.users.size, 1);
  assert.equal(users.identities.size, 1);
  assert.equal(restaurants.items.size, 1);
  assert.equal(refresh.items.size, 1);
});

test('rejects an already-registered email with ConflictError', async () => {
  const { useCase } = setup();
  await useCase.execute({ email: 'a@b.com', password: 'secret123', restaurantName: 'R1' });
  await assert.rejects(
    () => useCase.execute({ email: 'a@b.com', password: 'secret123', restaurantName: 'R2' }),
    ConflictError,
  );
});

test('rolls back the user/identity when the restaurant write fails (no orphan blocks re-signup)', async () => {
  const restaurants = new InMemoryRestaurantRepository();
  let failNext = true;
  const originalCreate = restaurants.create.bind(restaurants);
  restaurants.create = async (data) => {
    if (failNext) {
      failNext = false;
      throw new Error('simulated DB failure mid-transaction');
    }
    return originalCreate(data);
  };

  const { useCase, users } = setup(restaurants);

  await assert.rejects(
    () => useCase.execute({ email: 'dono@teste.com', password: 'secret123', restaurantName: 'R1' }),
    /simulated DB failure/,
  );

  // The partial writes must have been rolled back: no orphaned account/identity.
  assert.equal(users.users.size, 0, 'user_account must be rolled back');
  assert.equal(users.identities.size, 0, 'auth_identity must be rolled back');

  // Re-signup with the same email now succeeds (account was not orphaned).
  const result = await useCase.execute({
    email: 'dono@teste.com',
    password: 'secret123',
    restaurantName: 'R1',
  });
  assert.equal(typeof result.accessToken, 'string');
  assert.equal(users.users.size, 1);
});
