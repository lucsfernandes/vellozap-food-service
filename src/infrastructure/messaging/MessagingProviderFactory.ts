import type { DependencyContainer } from 'tsyringe';
import type { IMessagingProvider } from '../../application/ports/IMessagingProvider.js';
import { loadEnv } from '../config/env.js';
import { EvolutionApiProvider } from './EvolutionApiProvider.js';
import { N8nProvider } from './N8nProvider.js';

/** Resolves the active outbound provider from `WHATSAPP_PROVIDER`. */
export function resolveMessagingProvider(container: DependencyContainer): IMessagingProvider {
  const env = loadEnv();
  return env.WHATSAPP_PROVIDER === 'n8n'
    ? container.resolve(N8nProvider)
    : container.resolve(EvolutionApiProvider);
}
