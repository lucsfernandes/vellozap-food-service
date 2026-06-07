import type { DeliveryZone } from '../entities/DeliveryZone.js';

export interface DeliveryCalculation {
  distance: number;
  zone: DeliveryZone | null;
  deliveryFeeCents: number;
  canDeliver: boolean;
  message: string;
}

/**
 * Pure domain service that maps a distance (km) to a delivery zone and fee.
 * Mirrors the frontend `useDeliveryCalculator` logic.
 */
export class DeliveryFeeCalculator {
  /** Returns the first zone whose [min,max] range contains `distance`. */
  public findZone(distance: number, zones: ReadonlyArray<DeliveryZone>): DeliveryZone | null {
    return zones.find((z) => distance >= z.minDistance && distance <= z.maxDistance) ?? null;
  }

  public calculate(distance: number, zones: ReadonlyArray<DeliveryZone>): DeliveryCalculation {
    const zone = this.findZone(distance, zones);
    return {
      distance,
      zone,
      deliveryFeeCents: zone ? zone.priceCents : 0,
      canDeliver: zone !== null,
      message: zone ? `Entrega disponível - ${zone.description}` : 'Fora da área de entrega',
    };
  }
}
