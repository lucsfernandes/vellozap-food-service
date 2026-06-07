import type { OrderStatus, PaymentMethod, PaymentStatus } from '../enums/index.js';

/** Domain model mirroring `orders`. `totalAmountCents` is integer BRL cents. */
export interface Order {
  id: string;
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus | null;
  totalAmountCents: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewOrder {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: PaymentStatus | null;
  totalAmountCents: number;
  notes?: string | null;
}

export interface OrderWithItems extends Order {
  items: import('./OrderItem.js').OrderItem[];
}
