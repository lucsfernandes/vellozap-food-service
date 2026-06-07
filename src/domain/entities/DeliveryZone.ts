/** Domain model mirroring `delivery_zones`. `priceCents` is integer BRL cents. */
export interface DeliveryZone {
  id: string;
  restaurantId: string;
  minDistance: number;
  maxDistance: number;
  priceCents: number;
  description: string;
}

export interface DeliveryZoneInput {
  minDistance: number;
  maxDistance: number;
  priceCents: number;
  description: string;
}
