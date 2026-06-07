import type { IDistanceProvider } from '../../../src/application/ports/IDistanceProvider.js';

export class FakeDistanceProvider implements IDistanceProvider {
  public constructor(private readonly km: number = 2) {}
  public async distanceKm(): Promise<number> {
    return this.km;
  }
}
