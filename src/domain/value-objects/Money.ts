import { ValidationError } from '../errors/index.js';

/**
 * Integer money in BRL cents. Avoids floating-point drift across the
 * order/payment calculations. The REST contract exchanges cents as plain
 * `number`; the frontend formats BRL.
 */
export class Money {
  private constructor(public readonly cents: number) {}

  /** Builds from an integer number of cents. */
  public static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new ValidationError('Money cents must be an integer', { cents });
    }
    return new Money(cents);
  }

  /**
   * Builds from a decimal BRL amount (e.g. `12.5` → 1250 cents).
   * Rounds half-up to the nearest cent.
   */
  public static fromDecimal(amount: number): Money {
    if (!Number.isFinite(amount)) {
      throw new ValidationError('Money amount must be finite', { amount });
    }
    return new Money(Math.round(amount * 100));
  }

  public add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  public multiply(quantity: number): Money {
    if (!Number.isInteger(quantity)) {
      throw new ValidationError('Money multiplier must be an integer', { quantity });
    }
    return new Money(this.cents * quantity);
  }

  /** Decimal representation (e.g. 1250 → 12.5) for `numeric` persistence. */
  public toDecimal(): number {
    return this.cents / 100;
  }

  public equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  public static zero(): Money {
    return new Money(0);
  }
}
