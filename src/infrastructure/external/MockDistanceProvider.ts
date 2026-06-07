import { injectable } from 'tsyringe';
import type { IDistanceProvider } from '../../application/ports/IDistanceProvider.js';

/**
 * Mock distance provider mirroring the frontend `useDeliveryCalculator`
 * heuristic: |last3(origin) - last3(dest)| / 50, rounded to 2 decimals.
 * Replace with a ViaCEP + Maps implementation later (see plan 10).
 */
@injectable()
export class MockDistanceProvider implements IDistanceProvider {
  public async distanceKm(originCep: string, destinationCep: string): Promise<number> {
    const last3 = (cep: string): number => Number(cep.replace(/\D/g, '').slice(-3) || '0');
    const distance = Math.abs(last3(originCep) - last3(destinationCep)) / 50;
    return Math.round(distance * 100) / 100;
  }
}
