import type { ValueTransformer } from 'typeorm';

/**
 * Converts a Postgres `numeric` BRL amount (returned as string by the `pg`
 * driver) to integer cents in the domain, and back to a decimal string on write.
 */
export const moneyCentsTransformer: ValueTransformer = {
  to(centsValue: number | null | undefined): string | null {
    if (centsValue === null || centsValue === undefined) {
      return null;
    }
    return (centsValue / 100).toFixed(2);
  },
  from(dbValue: string | number | null): number | null {
    if (dbValue === null || dbValue === undefined) {
      return null;
    }
    const asNumber = typeof dbValue === 'string' ? Number(dbValue) : dbValue;
    return Math.round(asNumber * 100);
  },
};

/**
 * Converts a Postgres `numeric` to a plain JS number (the `pg` driver returns
 * strings for numeric). Used for non-money fields (hours/days).
 */
export const numericTransformer: ValueTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(dbValue: string | number | null): number | null {
    if (dbValue === null || dbValue === undefined) {
      return null;
    }
    return typeof dbValue === 'string' ? Number(dbValue) : dbValue;
  },
};
