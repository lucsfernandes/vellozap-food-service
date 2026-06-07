import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { useContainer, useExpressServer } from 'routing-controllers';
import type { DependencyContainer } from 'tsyringe';
import { loadEnv } from '../../infrastructure/config/env.js';
import { CONTROLLERS } from './controllers/index.js';
import { ErrorHandlerMiddleware } from './middlewares/ErrorHandlerMiddleware.js';
import { makeAuthorizationChecker, makeCurrentUserChecker } from './auth/checkers.js';
import { createAuthRateLimiters } from './middlewares/rateLimit.js';

/** Builds the configured Express app (without binding a port). */
export function createServer(diContainer: DependencyContainer): Express {
  const env = loadEnv();
  const app = express();

  // Behind a reverse proxy (e.g. in production), trust the configured number of
  // hops so rate limiting keys on the real client IP from X-Forwarded-For.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());

  // Capture rawBody (Buffer) for webhook signature verification.
  app.use(
    express.json({
      limit: '5mb',
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = Buffer.from(buf);
      },
    }),
  );
  // Allow raw bodies for multipart uploads (handled manually by upload.ts).
  app.use(express.raw({ type: 'multipart/form-data', limit: '10mb' }));

  // Serve local uploads. nosniff + inline disposition prevents browsers from
  // interpreting an uploaded file as active content (defense-in-depth, M1).
  app.use(
    '/uploads',
    express.static(env.STORAGE_LOCAL_DIR, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
      },
    }),
  );

  // Rate-limit the sensitive auth endpoints (C2). Mounted on the prefixed paths
  // so the limiter runs before routing-controllers dispatches to AuthController.
  const authLimiters = createAuthRateLimiters(env);
  app.use(`${env.API_PREFIX}/auth/login`, authLimiters.login);
  app.use(`${env.API_PREFIX}/auth/refresh`, authLimiters.refresh);

  // tsyringe ↔ routing-controllers bridge.
  useContainer({ get: (cls) => diContainer.resolve(cls as never) });

  useExpressServer(app, {
    routePrefix: env.API_PREFIX,
    controllers: [...CONTROLLERS],
    middlewares: [ErrorHandlerMiddleware],
    authorizationChecker: makeAuthorizationChecker(diContainer),
    currentUserChecker: makeCurrentUserChecker(),
    defaultErrorHandler: false,
    cors: false,
    validation: false,
    classTransformer: false,
  });

  return app;
}
