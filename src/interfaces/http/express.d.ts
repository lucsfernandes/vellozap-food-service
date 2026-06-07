import type { AccessTokenPayload } from '../../application/ports/ITokenService.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AccessTokenPayload;
      rawBody?: Buffer;
    }
  }
}

export {};
