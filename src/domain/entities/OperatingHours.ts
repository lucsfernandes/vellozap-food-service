/** Domain model mirroring `operating_hours`. `openTime`/`closeTime` are HH:MM[:SS] strings. */
export interface OperatingHours {
  id: string;
  restaurantId: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  createdAt: Date;
}

export interface OperatingHoursInput {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string | null;
  closeTime?: string | null;
}
