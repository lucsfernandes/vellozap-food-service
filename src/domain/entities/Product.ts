import type { ProductCategory } from '../enums/index.js';

/** Domain model mirroring `products`. `priceCents` is integer BRL cents. */
export interface Product {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  stockQuantity: number | null;
  category: ProductCategory | null;
  size: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewProduct {
  restaurantId: string;
  name: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  stockQuantity?: number | null;
  category?: ProductCategory | null;
  size?: string | null;
}

export type ProductPatch = Partial<Omit<NewProduct, 'restaurantId'>>;
