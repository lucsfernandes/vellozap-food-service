/** Domain model mirroring `restaurant_profiles`. */
export interface Restaurant {
  id: string;
  userId: string;
  restaurantName: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  responsibleName: string | null;
  cnpj: string | null;
  email: string | null;
  deliveryType: string | null;
  whatsappNumber: string | null;
  deliveryRadius: string | null;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Fields accepted when creating a restaurant profile (signup). */
export interface NewRestaurant {
  userId: string;
  restaurantName: string;
}

/** Mutable subset of a restaurant profile. */
export type RestaurantPatch = Partial<
  Pick<
    Restaurant,
    | 'restaurantName'
    | 'phone'
    | 'address'
    | 'logoUrl'
    | 'responsibleName'
    | 'cnpj'
    | 'email'
    | 'deliveryType'
    | 'whatsappNumber'
    | 'deliveryRadius'
    | 'onboardingCompleted'
  >
>;
