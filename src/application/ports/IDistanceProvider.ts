/** Resolves the distance (km) between two Brazilian CEPs. Mock in v1. */
export interface IDistanceProvider {
  distanceKm(originCep: string, destinationCep: string): Promise<number>;
}
