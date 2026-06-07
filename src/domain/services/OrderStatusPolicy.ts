import type { OrderStatus } from '../enums/index.js';
import { ValidationError } from '../errors/index.js';

/**
 * Allowed transitions of {@link OrderStatus}. Linear pending→preparing→ready→delivered,
 * with cancellation possible from any non-terminal state.
 */
const TRANSITIONS: Readonly<Record<OrderStatus, ReadonlyArray<OrderStatus>>> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/** Pure policy validating order-status transitions. No IO. */
export class OrderStatusPolicy {
  public canTransition(from: OrderStatus, to: OrderStatus): boolean {
    if (from === to) {
      return true;
    }
    return TRANSITIONS[from].includes(to);
  }

  /** Throws {@link ValidationError} when the transition is not allowed. */
  public assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new ValidationError(`Invalid order status transition: ${from} → ${to}`, {
        from,
        to,
        allowed: TRANSITIONS[from],
      });
    }
  }
}
