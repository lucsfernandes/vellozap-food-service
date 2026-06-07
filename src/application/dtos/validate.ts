import type { ZodTypeAny, output } from 'zod';
import { ValidationError } from '../../domain/errors/index.js';

/**
 * Parses `input` with a zod schema, throwing a domain ValidationError on
 * failure. Returns the schema's OUTPUT type (defaults applied, transforms run).
 */
export function validate<S extends ZodTypeAny>(schema: S, input: unknown): output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', {
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}
