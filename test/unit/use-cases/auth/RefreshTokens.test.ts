import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RefreshTokens } from '../../../../src/application/use-cases/auth/RefreshTokens.js';
import { UnauthorizedError } from '../../../../src/domain/errors/index.js';
import {
  InMemoryRefreshTokenRepository,
  InMemoryUserAccountRepository,
} from '../../../helpers/fakes/InMemoryAuthRepositories.js';
import { InMemoryRestaurantRepository } from '../../../helpers/fakes/InMemoryRestaurantRepository.js';
import { FakeTokenService } from '../../../helpers/fakes/FakeTokenService.js';
import { FixedClock } from '../../../helpers/fakes/FixedClock.js';

async function setup() {
  const refresh = new InMemoryRefreshTokenRepository();
  const users = new InMemoryUserAccountRepository();
  const restaurants = new InMemoryRestaurantRepository();
  const tokens = new FakeTokenService();
  const clock = new FixedClock('2026-06-06T12:00:00Z');
  const user = await users.create({ email: 'a@b.com', passwordHash: 'x' });
  restaurants.seed({ userId: user.id });

  const issued = tokens.signRefresh();
  await refresh.create({ userId: user.id, tokenHash: tokens.hashRefresh(issued.token), expiresAt: issued.expiresAt });

  const useCase = new RefreshTokens(refresh, users, restaurants, tokens, clock);
  return { useCase, refresh, tokens, user, currentToken: issued.token };
}

test('rotates the refresh token: revokes old, issues new', async () => {
  const { useCase, refresh, currentToken } = await setup();
  const result = await useCase.execute({ refreshToken: currentToken });
  assert.notEqual(result.refreshToken, currentToken);
  const revoked = [...refresh.items.values()].filter((r) => r.revokedAt !== null);
  assert.equal(revoked.length, 1);
  const active = [...refresh.items.values()].filter((r) => r.revokedAt === null);
  assert.equal(active.length, 1);
});

test('reuse detection: presenting a revoked token revokes the whole family', async () => {
  const { useCase, refresh, currentToken } = await setup();
  await useCase.execute({ refreshToken: currentToken }); // rotates; old now revoked
  await assert.rejects(() => useCase.execute({ refreshToken: currentToken }), UnauthorizedError);
  const active = [...refresh.items.values()].filter((r) => r.revokedAt === null);
  assert.equal(active.length, 0, 'all tokens of the user should be revoked after reuse');
});

test('rejects unknown refresh token', async () => {
  const { useCase } = await setup();
  await assert.rejects(() => useCase.execute({ refreshToken: 'nope' }), UnauthorizedError);
});

test('rejects expired refresh token', async () => {
  const refresh = new InMemoryRefreshTokenRepository();
  const users = new InMemoryUserAccountRepository();
  const restaurants = new InMemoryRestaurantRepository();
  const tokens = new FakeTokenService();
  const clock = new FixedClock('2026-06-06T12:00:00Z');
  const user = await users.create({ email: 'a@b.com', passwordHash: 'x' });
  const token = 'expired-token';
  await refresh.create({
    userId: user.id,
    tokenHash: tokens.hashRefresh(token),
    expiresAt: new Date('2026-06-01T00:00:00Z'),
  });
  const useCase = new RefreshTokens(refresh, users, restaurants, tokens, clock);
  await assert.rejects(() => useCase.execute({ refreshToken: token }), UnauthorizedError);
});
