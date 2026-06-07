import type { AppRole } from '../../domain/enums/index.js';

/** Authenticated principal attached to the request by the authorization checker. */
export interface AuthUser {
  id: string;
  role: AppRole;
  restaurantId?: string;
}
