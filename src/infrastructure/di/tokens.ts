/**
 * Centralized DI tokens. Using symbols avoids accidental string collisions
 * and decouples consumers from concrete class names.
 */
export const TOKENS = {
  // Repositories
  RestaurantRepository: Symbol.for('IRestaurantRepository'),
  ProductRepository: Symbol.for('IProductRepository'),
  OrderRepository: Symbol.for('IOrderRepository'),
  OrderItemRepository: Symbol.for('IOrderItemRepository'),
  EmployeeRepository: Symbol.for('IEmployeeRepository'),
  WorkRecordRepository: Symbol.for('IWorkRecordRepository'),
  EmployeePaymentRepository: Symbol.for('IEmployeePaymentRepository'),
  OnboardingRepository: Symbol.for('IOnboardingRepository'),
  OperatingHoursRepository: Symbol.for('IOperatingHoursRepository'),
  DeliveryZoneRepository: Symbol.for('IDeliveryZoneRepository'),
  ConversationRepository: Symbol.for('IConversationRepository'),
  PromotionRepository: Symbol.for('IPromotionRepository'),
  UserAccountRepository: Symbol.for('IUserAccountRepository'),
  RefreshTokenRepository: Symbol.for('IRefreshTokenRepository'),

  // Services / providers
  MessagingProvider: Symbol.for('IMessagingProvider'),
  TokenService: Symbol.for('ITokenService'),
  PasswordHasher: Symbol.for('IPasswordHasher'),
  Clock: Symbol.for('IClock'),
  StorageProvider: Symbol.for('IStorageProvider'),
  DistanceProvider: Symbol.for('IDistanceProvider'),
  CsvExportService: Symbol.for('ICsvExportService'),
  PdfExportService: Symbol.for('IPdfExportService'),
  HttpClient: Symbol.for('IHttpClient'),

  // Infrastructure
  DataSource: Symbol.for('DataSource'),
} as const;

export type DiToken = (typeof TOKENS)[keyof typeof TOKENS];
