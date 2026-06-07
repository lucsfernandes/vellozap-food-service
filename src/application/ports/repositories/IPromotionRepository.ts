import type { NewPromotion, Promotion, PromotionPatch } from '../../../domain/entities/Promotion.js';

export interface IPromotionRepository {
  listByRestaurant(restaurantId: string): Promise<Promotion[]>;
  findById(id: string): Promise<Promotion | null>;
  create(data: NewPromotion): Promise<Promotion>;
  update(id: string, patch: PromotionPatch): Promise<Promotion>;
  delete(id: string): Promise<void>;
}
