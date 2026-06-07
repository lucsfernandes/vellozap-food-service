/** Domain model mirroring `order_items`. Prices are integer BRL cents. */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  notes: string | null;
  createdAt: Date;
}

export interface NewOrderItem {
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  notes?: string | null;
}
