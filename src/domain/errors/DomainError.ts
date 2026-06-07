/**
 * Base class for all domain-level errors. The HTTP layer translates each
 * subclass to a specific status code via {@link ../../interfaces/http/middlewares/ErrorHandlerMiddleware}.
 */
export abstract class DomainError extends Error {
  /** Stable machine-readable error code (e.g. `NOT_FOUND`). */
  public abstract readonly code: string;
  /** HTTP status the error maps to. */
  public abstract readonly status: number;
  /** Optional structured details surfaced to the client. */
  public readonly details?: Readonly<Record<string, unknown>>;

  protected constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    if (details !== undefined) {
      this.details = details;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
