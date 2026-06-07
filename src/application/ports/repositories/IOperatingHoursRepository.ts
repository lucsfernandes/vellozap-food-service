import type { OperatingHours, OperatingHoursInput } from '../../../domain/entities/OperatingHours.js';

export interface IOperatingHoursRepository {
  listByRestaurant(restaurantId: string): Promise<OperatingHours[]>;
  /** Replaces the full set of 7-day rows for a restaurant (upsert by day_of_week). */
  replaceAll(restaurantId: string, rows: ReadonlyArray<OperatingHoursInput>): Promise<OperatingHours[]>;
}
