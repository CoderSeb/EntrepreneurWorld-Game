import Constants from 'expo-constants';
import { Platform } from 'react-native';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function rejectInsecureProductionUrl(url: string): string | null {
  if (__DEV__) {
    return url;
  }
  if (!url.startsWith('https://')) {
    return null;
  }
  return url;
}

function normalizeDevApiUrl(url: string): string {
  // Common local typo when API script uses 5080.
  return url.replace(':5388', ':5080');
}

/** Resolve API base URL. Returns null when backend sync should stay disabled. */
export function getApiBaseUrl(): string | null {
  const fromPublicEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromPublicEnv) {
    return rejectInsecureProductionUrl(normalizeBaseUrl(normalizeDevApiUrl(fromPublicEnv)));
  }

  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  if (extra?.apiBaseUrl?.trim()) {
    return rejectInsecureProductionUrl(normalizeBaseUrl(normalizeDevApiUrl(extra.apiBaseUrl)));
  }

  if (__DEV__) {
    // Android emulator maps host localhost to 10.0.2.2
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:5080'
      : 'http://localhost:5080';
  }

  return null;
}

export function isBackendEnabled(): boolean {
  return getApiBaseUrl() !== null;
}
