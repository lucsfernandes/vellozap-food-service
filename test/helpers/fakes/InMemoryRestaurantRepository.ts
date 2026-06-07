import { randomUUID } from 'node:crypto';
import type { IRestaurantRepository } from '../../../src/application/ports/repositories/IRestaurantRepository.js';
import type { NewRestaurant, Restaurant, RestaurantPatch } from '../../../src/domain/entities/Restaurant.js';
import { NotFoundError } from '../../../src/domain/errors/index.js';

export class InMemoryRestaurantRepository implements IRestaurantRepository {
  public readonly items = new Map<string, Restaurant>();

  public seed(partial: Partial<Restaurant> & { userId: string }): Restaurant {
    const now = new Date();
    const r: Restaurant = {
      id: partial.id ?? randomUUID(),
      userId: partial.userId,
      restaurantName: partial.restaurantName ?? 'Test Restaurant',
      phone: partial.phone ?? null,
      address: partial.address ?? null,
      logoUrl: partial.logoUrl ?? null,
      responsibleName: partial.responsibleName ?? null,
      cnpj: partial.cnpj ?? null,
      email: partial.email ?? null,
      deliveryType: partial.deliveryType ?? 'delivery',
      whatsappNumber: partial.whatsappNumber ?? null,
      deliveryRadius: partial.deliveryRadius ?? '10km',
      onboardingCompleted: partial.onboardingCompleted ?? false,
      createdAt: partial.createdAt ?? now,
      updatedAt: partial.updatedAt ?? now,
    };
    this.items.set(r.id, r);
    return r;
  }

  public async findByOwnerUserId(userId: string): Promise<Restaurant | null> {
    for (const r of this.items.values()) {
      if (r.userId === userId) return r;
    }
    return null;
  }

  public async findById(id: string): Promise<Restaurant | null> {
    return this.items.get(id) ?? null;
  }

  public async findByWhatsappNumber(digits: string): Promise<Restaurant | null> {
    for (const r of this.items.values()) {
      if ((r.whatsappNumber ?? '').replace(/\D/g, '') === digits) return r;
    }
    return null;
  }

  public async create(data: NewRestaurant): Promise<Restaurant> {
    return this.seed({ userId: data.userId, restaurantName: data.restaurantName });
  }

  public async update(id: string, patch: RestaurantPatch): Promise<Restaurant> {
    const existing = this.items.get(id);
    if (!existing) throw new NotFoundError('Restaurant not found');
    const updated: Restaurant = { ...existing, ...patch, updatedAt: new Date() };
    this.items.set(id, updated);
    return updated;
  }
}
