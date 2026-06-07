import { RestaurantProfileEntity } from './RestaurantProfileEntity.js';
import { ProductEntity } from './ProductEntity.js';
import { OrderEntity } from './OrderEntity.js';
import { OrderItemEntity } from './OrderItemEntity.js';
import { EmployeeEntity } from './EmployeeEntity.js';
import { EmployeeWorkRecordEntity } from './EmployeeWorkRecordEntity.js';
import { EmployeePaymentEntity } from './EmployeePaymentEntity.js';
import { OnboardingProgressEntity } from './OnboardingProgressEntity.js';
import { OperatingHoursEntity } from './OperatingHoursEntity.js';
import { UserAccountEntity } from './UserAccountEntity.js';
import { AuthIdentityEntity } from './AuthIdentityEntity.js';
import { RefreshTokenEntity } from './RefreshTokenEntity.js';
import { DeliveryZoneEntity } from './DeliveryZoneEntity.js';
import { PromotionEntity } from './PromotionEntity.js';
import { WaConversationEntity } from './WaConversationEntity.js';
import { WaMessageEntity } from './WaMessageEntity.js';

export const ALL_ENTITIES = [
  RestaurantProfileEntity,
  ProductEntity,
  OrderEntity,
  OrderItemEntity,
  EmployeeEntity,
  EmployeeWorkRecordEntity,
  EmployeePaymentEntity,
  OnboardingProgressEntity,
  OperatingHoursEntity,
  UserAccountEntity,
  AuthIdentityEntity,
  RefreshTokenEntity,
  DeliveryZoneEntity,
  PromotionEntity,
  WaConversationEntity,
  WaMessageEntity,
] as const;

export {
  RestaurantProfileEntity,
  ProductEntity,
  OrderEntity,
  OrderItemEntity,
  EmployeeEntity,
  EmployeeWorkRecordEntity,
  EmployeePaymentEntity,
  OnboardingProgressEntity,
  OperatingHoursEntity,
  UserAccountEntity,
  AuthIdentityEntity,
  RefreshTokenEntity,
  DeliveryZoneEntity,
  PromotionEntity,
  WaConversationEntity,
  WaMessageEntity,
};
