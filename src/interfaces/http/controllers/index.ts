import { HealthController } from './HealthController.js';
import { AuthController } from './AuthController.js';
import { RestaurantController } from './RestaurantController.js';
import { OnboardingController } from './OnboardingController.js';
import { OperatingHoursController } from './OperatingHoursController.js';
import { ProductController } from './ProductController.js';
import { EmployeeController } from './EmployeeController.js';
import { WorkRecordController } from './WorkRecordController.js';
import { OrderController } from './OrderController.js';
import { OrderItemController } from './OrderItemController.js';
import { PaymentController } from './PaymentController.js';
import { DeliveryController } from './DeliveryController.js';
import { ExportController } from './ExportController.js';
import { PublicMenuController } from './PublicMenuController.js';
import { PromotionController } from './PromotionController.js';
import { WhatsAppController } from './WhatsAppController.js';
import { WhatsAppWebhookController } from './WhatsAppWebhookController.js';

export const CONTROLLERS = [
  HealthController,
  AuthController,
  RestaurantController,
  OnboardingController,
  OperatingHoursController,
  ProductController,
  EmployeeController,
  WorkRecordController,
  OrderController,
  OrderItemController,
  PaymentController,
  DeliveryController,
  ExportController,
  PublicMenuController,
  PromotionController,
  WhatsAppController,
  WhatsAppWebhookController,
] as const;
