import economyConfigJson from '../../../assets/config/economy_config_v1.json';
import { EconomyConfig, parseEconomyConfig } from '@/domain/config/EconomyConfig';

let cached: EconomyConfig | null = null;

export function loadEconomyConfig(): EconomyConfig {
  if (!cached) {
    cached = parseEconomyConfig(economyConfigJson as Parameters<typeof parseEconomyConfig>[0]);
  }
  return cached;
}

export function clearEconomyConfigCache(): void {
  cached = null;
}
