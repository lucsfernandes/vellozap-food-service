/**
 * Recursive readonly utility for immutable state shapes.
 * Arrays become ReadonlyArray and nested objects become readonly.
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/** Removes `readonly` modifiers one level deep. */
export type Mutable<T> = { -readonly [K in keyof T]: T[K] };
