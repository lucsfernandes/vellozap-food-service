import type { Action } from 'routing-controllers';
import type { DependencyContainer } from 'tsyringe';
import type { Request } from 'express';
import type { ITokenService } from '../../../application/ports/ITokenService.js';
import type { AuthUser } from '../../../application/auth/AuthUser.js';
import type { AppRole } from '../../../domain/enums/index.js';
import { ForbiddenError, UnauthorizedError } from '../../../domain/errors/index.js';
import { TOKENS } from '../../../infrastructure/di/tokens.js';

function extractBearer(req: Request): string | null {
  const header = req.headers['authorization'];
  if (!header || Array.isArray(header)) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/** RBAC checker for routing-controllers `@Authorized(roles)`. */
export function makeAuthorizationChecker(container: DependencyContainer) {
  return (action: Action, roles: AppRole[]): boolean => {
    const req = action.request as Request;
    const token = extractBearer(req);
    // No/invalid token → 401 (thrown so the error middleware maps it precisely);
    // valid token but insufficient role → 403.
    if (!token) {
      throw new UnauthorizedError('Missing access token');
    }
    const tokenService = container.resolve<ITokenService>(TOKENS.TokenService);
    const payload = tokenService.verifyAccess(token); // throws UnauthorizedError on bad token
    req.authUser = payload;
    if (!roles || roles.length === 0) {
      return true;
    }
    if (!roles.includes(payload.role)) {
      throw new ForbiddenError('Insufficient role');
    }
    return true;
  };
}

/** Supplies the principal for `@CurrentUser()`. */
export function makeCurrentUserChecker() {
  return (action: Action): AuthUser | undefined => {
    const req = action.request as Request;
    const payload = req.authUser;
    if (!payload) {
      return undefined;
    }
    const user: AuthUser = { id: payload.sub, role: payload.role };
    if (payload.restaurantId !== undefined) {
      user.restaurantId = payload.restaurantId;
    }
    return user;
  };
}
