import { DomainError } from './DomainError.js';

/** Resource does not exist (or is out of the caller's tenant scope). → HTTP 404 */
export class NotFoundError extends DomainError {
  public readonly code = 'NOT_FOUND';
  public readonly status = 404;
  public constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** Input failed business/schema validation. → HTTP 422 */
export class ValidationError extends DomainError {
  public readonly code = 'VALIDATION_ERROR';
  public readonly status = 422;
  public constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** Caller is authenticated but not allowed to perform the action. → HTTP 403 */
export class ForbiddenError extends DomainError {
  public readonly code = 'FORBIDDEN';
  public readonly status = 403;
  public constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** State conflict (e.g. duplicate email). → HTTP 409 */
export class ConflictError extends DomainError {
  public readonly code = 'CONFLICT';
  public readonly status = 409;
  public constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** Caller is not authenticated / token invalid. → HTTP 401 */
export class UnauthorizedError extends DomainError {
  public readonly code = 'UNAUTHORIZED';
  public readonly status = 401;
  public constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export { DomainError };
