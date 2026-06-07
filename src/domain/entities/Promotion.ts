/** Domain model mirroring `promotions`. `discountCents` interpreted per `type`. */
export interface Promotion {
  id: string;
  restaurantId: string;
  name: string;
  type: string;
  discountCents: number;
  productIds: string[] | null;
  validFrom: Date | null;
  validTo: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewPromotion {
  restaurantId: string;
  name: string;
  type: string;
  discountCents: number;
  productIds?: string[] | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  active?: boolean;
}

export type PromotionPatch = Partial<Omit<NewPromotion, 'restaurantId'>>;
