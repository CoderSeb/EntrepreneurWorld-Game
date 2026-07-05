import { ApiClient } from '@/services/api/ApiClient';
import { AnalyticsEventIds } from '@/services/analytics/analyticsEventIds';
import { trackClientEvent } from '@/services/analytics/analyticsService';
import { ensureAuthenticated } from '@/services/auth/authService';
import { AuthSession } from '@/services/auth/authSessionStore';
import {
  buildCloudUploadRequest,
  cloudUpdatedAtUnix,
  pickSaveBeforeOffline,
  shouldUploadLocalToCloud,
} from '@/services/backend/cloudSaveSyncService';
import { loadEconomyConfigWithRemoteFallback } from '@/services/backend/remoteConfigLoader';
import { getApiBaseUrl } from '@/config/backendConfig';
import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { SaveData } from '@/domain/save/SaveData';
import {
  attachChecksum,
} from '@/domain/save/SaveIntegrityService';
import { saveDataToDictionary } from '@/domain/save/SaveSerializer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CloudSaveResponse,
  PlayerProfileResponse,
  PurchaseEntitlementDto,
} from '@/services/api/types';

const SAVE_KEY = '@business-empire/save/slot_0';
const BACKUP_KEY = '@business-empire/save/slot_0.backup';

export type BackendStatus = {
  enabled: boolean;
  connected: boolean;
  playerId: string | null;
  profileStatus: string | null;
  cloudSaveEnabled: boolean;
  economyConfigSource: 'bundled' | 'remote';
  lastSyncAtUnix: number | null;
  lastError: string | null;
  welcomeTitle: string | null;
};

export type BackendBootstrapResult = {
  economyConfig: EconomyConfig;
  saveData: SaveData | null;
  hasLoadedSave: boolean;
  session: AuthSession | null;
  status: BackendStatus;
  entitlements: string[];
};

export async function runBackendBootstrap(
  localSave: SaveData | null,
  localHasSave: boolean,
  nowUnix: number,
): Promise<BackendBootstrapResult> {
  const baseUrl = getApiBaseUrl();
  const defaultStatus: BackendStatus = {
    enabled: baseUrl !== null,
    connected: false,
    playerId: null,
    profileStatus: null,
    cloudSaveEnabled: false,
    economyConfigSource: 'bundled',
    lastSyncAtUnix: null,
    lastError: null,
    welcomeTitle: null,
  };

  const bundledOnly = await loadEconomyConfigWithRemoteFallback(null, false);

  if (!baseUrl) {
    return {
      economyConfig: bundledOnly.config,
      saveData: localSave,
      hasLoadedSave: localHasSave,
      session: null,
      status: defaultStatus,
      entitlements: [],
    };
  }

  const api = new ApiClient(baseUrl);

  try {
    const health = await api.ping('/health');
    if (!health.ok) {
      return fallbackLocal(
        defaultStatus,
        bundledOnly.config,
        localSave,
        localHasSave,
        health.message ?? 'API unreachable — start with pwsh ./scripts/run-api-with-postgres.ps1',
      );
    }

    const bootstrap = await api.get<import('@/services/api/types').BootstrapConfigResponse>(
      '/api/v1/config/bootstrap',
    );
    if (bootstrap.success === false) {
      return fallbackLocal(defaultStatus, bundledOnly.config, localSave, localHasSave, bootstrap.error.message);
    }

    const remoteConfigEnabled = bootstrap.data.featureFlags.remote_config ?? false;
    const cloudSaveEnabled = bootstrap.data.featureFlags.cloud_save ?? false;
    const economyLoad = await loadEconomyConfigWithRemoteFallback(api, remoteConfigEnabled);

    const auth = await ensureAuthenticated(api, nowUnix);
    if (!auth.session) {
      return fallbackLocal(
        {
          ...defaultStatus,
          connected: true,
          cloudSaveEnabled,
          economyConfigSource: economyLoad.source,
          welcomeTitle: bootstrap.data.remoteStrings.welcome_title ?? null,
          lastError: auth.error,
        },
        economyLoad.config,
        localSave,
        localHasSave,
        auth.error,
      );
    }

    let profileStatus: string | null = null;
    const profile = await api.get<PlayerProfileResponse>(
      '/api/v1/player/me',
      auth.session.accessToken,
    );
    if (profile.success) {
      profileStatus = profile.data.status;
    }

    const entitlements = await fetchEntitlements(api, auth.session.accessToken, nowUnix);

    let resolvedSave = localSave;
    let hasLoadedSave = localHasSave;
    let lastSyncAtUnix: number | null = null;

    if (cloudSaveEnabled) {
      const cloudResult = await api.get<CloudSaveResponse>(
        '/api/v1/player/save',
        auth.session.accessToken,
      );

      const cloudSave = cloudResult.success ? cloudResult.data : null;
      const pick = await pickSaveBeforeOffline(localSave, cloudSave);

      if (pick.winner === 'cloud' && pick.saveData) {
        resolvedSave = pick.saveData;
        hasLoadedSave = true;
        await persistSaveLocally(pick.saveData);
        lastSyncAtUnix = cloudUpdatedAtUnix(cloudSave!.updatedAt);
      } else if (pick.winner === 'local' && localSave && shouldUploadLocalToCloud(localSave, cloudSave)) {
        const uploaded = await uploadCloudSave(api, auth.session.accessToken, localSave);
        if (uploaded) {
          lastSyncAtUnix = nowUnix;
        }
      } else if (cloudSave) {
        lastSyncAtUnix = cloudUpdatedAtUnix(cloudSave.updatedAt);
      }
    }

    resolvedSave = applyEntitlementsToSave(resolvedSave, entitlements, nowUnix);

    await trackClientEvent(api, auth.session.accessToken, {
      eventName: AnalyticsEventIds.sessionStart,
      economyVersion: economyLoad.config.version,
      clientVersion: '0.1.0',
      properties: {
        cloud_save_enabled: cloudSaveEnabled,
        economy_source: economyLoad.source,
      },
    });

    return {
      economyConfig: economyLoad.config,
      saveData: resolvedSave,
      hasLoadedSave,
      session: auth.session,
      status: {
        enabled: true,
        connected: true,
        playerId: auth.session.playerId,
        profileStatus,
        cloudSaveEnabled,
        economyConfigSource: economyLoad.source,
        lastSyncAtUnix,
        lastError: null,
        welcomeTitle: bootstrap.data.remoteStrings.welcome_title ?? null,
      },
      entitlements,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backend bootstrap failed';
    return fallbackLocal(defaultStatus, bundledOnly.config, localSave, localHasSave, message);
  }
}

export async function uploadCloudSaveDirect(
  saveData: SaveData,
  session: AuthSession,
): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return false;
  }

  const api = new ApiClient(baseUrl);
  return uploadCloudSave(api, session.accessToken, saveData);
}

export async function syncCloudSaveNow(
  saveData: SaveData,
  session: AuthSession,
): Promise<{ success: boolean; message: string; lastSyncAtUnix: number | null }> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return { success: false, message: 'Backend is not configured', lastSyncAtUnix: null };
  }

  const api = new ApiClient(baseUrl);
  const uploaded = await uploadCloudSave(api, session.accessToken, saveData);
  return {
    success: uploaded,
    message: uploaded ? 'Cloud save synced' : 'Cloud upload failed',
    lastSyncAtUnix: uploaded ? Math.floor(Date.now() / 1000) : null,
  };
}

export async function uploadCloudSaveIfNeeded(
  saveData: SaveData,
  session: AuthSession | null,
  cloudSaveEnabled: boolean,
): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl || !session || !cloudSaveEnabled) {
    return false;
  }

  const api = new ApiClient(baseUrl);
  const cloudResult = await api.get<CloudSaveResponse>('/api/v1/player/save', session.accessToken);
  const cloudSave = cloudResult.success ? cloudResult.data : null;

  if (!shouldUploadLocalToCloud(saveData, cloudSave)) {
    return false;
  }

  return uploadCloudSave(api, session.accessToken, saveData);
}

async function uploadCloudSave(
  api: ApiClient,
  accessToken: string,
  saveData: SaveData,
): Promise<boolean> {
  await attachChecksum(saveData);
  const request = buildCloudUploadRequest(saveData);
  const result = await api.put<CloudSaveResponse>('/api/v1/player/save', request, accessToken);
  return result.success;
}

async function persistSaveLocally(saveData: SaveData): Promise<void> {
  await attachChecksum(saveData);
  const payload = saveDataToDictionary(saveData);
  const jsonText = JSON.stringify(payload);

  const existing = await AsyncStorage.getItem(SAVE_KEY);
  if (existing) {
    await AsyncStorage.setItem(BACKUP_KEY, existing);
  }
  await AsyncStorage.setItem(SAVE_KEY, jsonText);
}

async function fetchEntitlements(
  api: ApiClient,
  accessToken: string,
  nowUnix: number,
): Promise<string[]> {
  const result = await api.get<PurchaseEntitlementDto[]>('/api/v1/player/entitlements', accessToken);
  if (!result.success) {
    return [];
  }

  return result.data
    .filter((entry) => Math.floor(new Date(entry.expiresAt).getTime() / 1000) > nowUnix)
    .map((entry) => entry.entitlementId);
}

function applyEntitlementsToSave(
  saveData: SaveData | null,
  entitlements: string[],
  nowUnix: number,
): SaveData | null {
  if (!saveData || entitlements.length === 0) {
    return saveData;
  }

  saveData.purchases.entitlements = [...new Set([...saveData.purchases.entitlements, ...entitlements])];
  saveData.purchases.lastValidatedAtUnix = nowUnix;
  return saveData;
}

function fallbackLocal(
  status: BackendStatus,
  economyConfig: EconomyConfig,
  localSave: SaveData | null,
  localHasSave: boolean,
  error: string | null,
): BackendBootstrapResult {
  return {
    economyConfig,
    saveData: localSave,
    hasLoadedSave: localHasSave,
    session: null,
    entitlements: [],
    status: {
      ...status,
      lastError: error,
    },
  };
}

export async function deletePlayerAccount(session: AuthSession): Promise<{ success: boolean; message: string }> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return { success: false, message: 'Backend is not configured' };
  }

  const api = new ApiClient(baseUrl);
  const result = await api.post<{ playerId: string; status: string; deletedAt: string }>(
    '/api/v1/player/delete-account',
    {},
    session.accessToken,
  );

  if (result.success === false) {
    return { success: false, message: result.error.message };
  }

  return { success: true, message: 'Account deleted' };
}
