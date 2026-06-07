import type { IClock } from '../../../src/application/ports/IClock.js';

/** Deterministic clock for tests. */
export class FixedClock implements IClock {
  private current: Date;

  public constructor(iso: string) {
    this.current = new Date(iso);
  }

  public now(): Date {
    return new Date(this.current);
  }

  public set(iso: string): void {
    this.current = new Date(iso);
  }
}
