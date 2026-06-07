import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ExpressErrorMiddlewareInterface, Middleware } from 'routing-controllers';
import { injectable } from 'tsyringe';
import { DomainError } from '../../../domain/errors/index.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Translates domain/zod/unknown errors into the standardized error envelope. */
@Middleware({ type: 'after' })
@injectable()
export class ErrorHandlerMiddleware implements ExpressErrorMiddlewareInterface {
  public error(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (res.headersSent) {
      return;
    }

    if (error instanceof DomainError) {
      const body: ErrorBody = { error: { code: error.code, message: error.message } };
      if (error.details !== undefined) {
        body.error.details = error.details;
      }
      res.status(error.status).json(body);
      return;
    }

    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      } satisfies ErrorBody);
      return;
    }

    // routing-controllers auth failures carry httpCode 401/403.
    const maybeHttp = error as { httpCode?: number; message?: string };
    if (maybeHttp && typeof maybeHttp.httpCode === 'number') {
      const code = maybeHttp.httpCode === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED';
      res.status(maybeHttp.httpCode).json({
        error: { code, message: maybeHttp.message ?? 'Unauthorized' },
      } satisfies ErrorBody);
      return;
    }

    // eslint-disable-next-line no-console
    console.error('Unhandled error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    } satisfies ErrorBody);
  }
}
