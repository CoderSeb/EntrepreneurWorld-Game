import { EconomyConfig, parseEconomyConfig } from '@/domain/config/EconomyConfig';
import bundledEconomyJson from '../../../assets/config/economy_config_v1.json';
import { ApiClient } from '@/services/api/ApiClient';
import { BootstrapConfigResponse, EconomyConfigResponse } from '@/services/api/types';

export type RemoteBootstrapData = {
  bootstrap: BootstrapConfigResponse;
  economyConfig: EconomyConfig | null;
};

export async function fetchBootstrap(api: ApiClient): Promise<BootstrapConfigResponse | null> {
  const result = await api.get<BootstrapConfigResponse>('/api/v1/config/bootstrap');
  return result.success ? result.data : null;
}

export async function fetchRemoteEconomyConfig(
  api: ApiClient,
  bundledVersion: number,
): Promise<EconomyConfig | null> {
  const result = await api.get<EconomyConfigResponse>('/api/v1/config/economy');
  if (!result.success) {
    return null;
  }

  if (result.data.version < bundledVersion) {
    return null;
  }

  try {
    const parsed = JSON.parse(result.data.payloadJson) as Parameters<typeof parseEconomyConfig>[0];
    const config = parseEconomyConfig(parsed);
    if (config.industries && Object.keys(config.industries).length > 0) {
      return config;
    }
  } catch {
    return null;
  }

  return null;
}

export function loadBundledEconomyConfig(): EconomyConfig {
  return parseEconomyConfig(bundledEconomyJson as Parameters<typeof parseEconomyConfig>[0]);
}

export async function loadEconomyConfigWithRemoteFallback(
  api: ApiClient | null,
  remoteConfigEnabled: boolean,
): Promise<{ config: EconomyConfig; source: 'bundled' | 'remote' }> {
  const bundled = loadBundledEconomyConfig();

  if (!api || !remoteConfigEnabled) {
    return { config: bundled, source: 'bundled' };
  }

  const remote = await fetchRemoteEconomyConfig(api, bundled.version);
  if (remote) {
    return { config: remote, source: 'remote' };
  }

  return { config: bundled, source: 'bundled' };
}
