import { container, type DependencyContainer } from 'tsyringe';
import type { DataSource } from 'typeorm';
import { TOKENS } from './tokens.js';

import { SystemClock } from '../time/SystemClock.js';
import { JwtTokenService } from '../auth/JwtTokenService.js';
import { Argon2PasswordHasher } from '../auth/Argon2PasswordHasher.js';
import { AxiosHttpClient } from '../external/http/AxiosHttpClient.js';
import { MockDistanceProvider } from '../external/MockDistanceProvider.js';
import { LocalStorageProvider } from '../storage/LocalStorageProvider.js';
import { CsvExportService } from '../export/CsvExportService.js';
import { PdfExportService } from '../export/PdfExportService.js';
import { resolveMessagingProvider } from '../messaging/MessagingProviderFactory.js';

import { TypeOrmRestaurantRepository } from '../database/repositories/TypeOrmRestaurantRepository.js';
import { TypeOrmProductRepository } from '../database/repositories/TypeOrmProductRepository.js';
import { TypeOrmOrderRepository } from '../database/repositories/TypeOrmOrderRepository.js';
import { TypeOrmOrderItemRepository } from '../database/repositories/TypeOrmOrderItemRepository.js';
import { TypeOrmEmployeeRepository } from '../database/repositories/TypeOrmEmployeeRepository.js';
import { TypeOrmWorkRecordRepository } from '../database/repositories/TypeOrmWorkRecordRepository.js';
import { TypeOrmEmployeePaymentRepository } from '../database/repositories/TypeOrmEmployeePaymentRepository.js';
import { TypeOrmOnboardingRepository } from '../database/repositories/TypeOrmOnboardingRepository.js';
import { TypeOrmOperatingHoursRepository } from '../database/repositories/TypeOrmOperatingHoursRepository.js';
import { TypeOrmDeliveryZoneRepository } from '../database/repositories/TypeOrmDeliveryZoneRepository.js';
import { TypeOrmConversationRepository } from '../database/repositories/TypeOrmConversationRepository.js';
import { TypeOrmPromotionRepository } from '../database/repositories/TypeOrmPromotionRepository.js';
import { TypeOrmUserAccountRepository } from '../database/repositories/TypeOrmUserAccountRepository.js';
import { TypeOrmRefreshTokenRepository } from '../database/repositories/TypeOrmRefreshTokenRepository.js';

/**
 * Wires every port to its implementation. Call once during bootstrap (and in
 * tests, optionally overriding tokens with in-memory fakes via `useValue`).
 *
 * The DataSource must be registered before resolving any repository.
 */
export function registerDependencies(dataSource: DataSource): DependencyContainer {
  container.register(TOKENS.DataSource, { useValue: dataSource });

  // Infrastructure services / providers (singletons).
  container.registerSingleton(TOKENS.Clock, SystemClock);
  container.registerSingleton(TOKENS.TokenService, JwtTokenService);
  container.registerSingleton(TOKENS.PasswordHasher, Argon2PasswordHasher);
  container.registerSingleton(TOKENS.HttpClient, AxiosHttpClient);
  container.registerSingleton(TOKENS.DistanceProvider, MockDistanceProvider);
  container.registerSingleton(TOKENS.StorageProvider, LocalStorageProvider);
  container.registerSingleton(TOKENS.CsvExportService, CsvExportService);
  container.registerSingleton(TOKENS.PdfExportService, PdfExportService);

  // Active WhatsApp provider selected by env.
  container.register(TOKENS.MessagingProvider, {
    useFactory: (c) => resolveMessagingProvider(c),
  });

  // Repositories.
  container.registerSingleton(TOKENS.RestaurantRepository, TypeOrmRestaurantRepository);
  container.registerSingleton(TOKENS.ProductRepository, TypeOrmProductRepository);
  container.registerSingleton(TOKENS.OrderRepository, TypeOrmOrderRepository);
  container.registerSingleton(TOKENS.OrderItemRepository, TypeOrmOrderItemRepository);
  container.registerSingleton(TOKENS.EmployeeRepository, TypeOrmEmployeeRepository);
  container.registerSingleton(TOKENS.WorkRecordRepository, TypeOrmWorkRecordRepository);
  container.registerSingleton(TOKENS.EmployeePaymentRepository, TypeOrmEmployeePaymentRepository);
  container.registerSingleton(TOKENS.OnboardingRepository, TypeOrmOnboardingRepository);
  container.registerSingleton(TOKENS.OperatingHoursRepository, TypeOrmOperatingHoursRepository);
  container.registerSingleton(TOKENS.DeliveryZoneRepository, TypeOrmDeliveryZoneRepository);
  container.registerSingleton(TOKENS.ConversationRepository, TypeOrmConversationRepository);
  container.registerSingleton(TOKENS.PromotionRepository, TypeOrmPromotionRepository);
  container.registerSingleton(TOKENS.UserAccountRepository, TypeOrmUserAccountRepository);
  container.registerSingleton(TOKENS.RefreshTokenRepository, TypeOrmRefreshTokenRepository);

  return container;
}

export { container };
