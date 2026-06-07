import type { NewRestaurant, Restaurant, RestaurantPatch } from '../../../domain/entities/Restaurant.js';

export interface IRestaurantRepository {
  findByOwnerUserId(userId: string): Promise<Restaurant | null>;
  findById(id: string): Promise<Restaurant | null>;
  /** Matches by digits-only whatsapp_number; used to route inbound WhatsApp webhooks. */
  findByWhatsappNumber(digits: string): Promise<Restaurant | null>;
  create(data: NewRestaurant): Promise<Restaurant>;
  update(id: string, patch: RestaurantPatch): Promise<Restaurant>;
}
