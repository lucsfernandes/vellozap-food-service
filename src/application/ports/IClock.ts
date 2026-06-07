/** Abstraction over the system clock for deterministic tests. */
export interface IClock {
  now(): Date;
}
