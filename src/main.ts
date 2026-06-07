import 'reflect-metadata';
import { AppDataSource } from './infrastructure/config/data-source.js';
import { loadEnv } from './infrastructure/config/env.js';
import { registerDependencies } from './infrastructure/di/container.js';
import { createServer } from './interfaces/http/server.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();

  await AppDataSource.initialize();
  const diContainer = registerDependencies(AppDataSource);

  const app = createServer(diContainer);

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`vellozap-food-service listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start service:', error);
  process.exitCode = 1;
});
