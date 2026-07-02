import { ApiClient, isApiFailure } from '@/services/api/ApiClient';
import { AuthTokenResponse } from '@/services/api/types';
import {
  AuthSession,
  getOrCreateDeviceId,
  isSessionValid,
  loadAuthSession,
  saveAuthSession,
} from '@/services/auth/authSessionStore';

async function createAnonymousSession(
  api: ApiClient,
  nowUnix: number,
): Promise<{ session: AuthSession | null; error: string | null }> {
  const deviceId = await getOrCreateDeviceId();
  const result = await api.post<AuthTokenResponse>('/api/v1/auth/anonymous', { deviceId });
  if (isApiFailure(result)) {
    return { session: null, error: result.error.message };
  }

  const session: AuthSession = {
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
    expiresAtUnix: nowUnix + result.data.expiresInSeconds,
    playerId: result.data.playerId,
  };
  await saveAuthSession(session);
  return { session, error: null };
}

async function refreshSession(
  api: ApiClient,
  existing: AuthSession,
  nowUnix: number,
): Promise<{ session: AuthSession | null; error: string | null }> {
  const result = await api.post<AuthTokenResponse>('/api/v1/auth/refresh', {
    refreshToken: existing.refreshToken,
  });
  if (isApiFailure(result)) {
    return { session: null, error: result.error.message };
  }

  const session: AuthSession = {
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
    expiresAtUnix: nowUnix + result.data.expiresInSeconds,
    playerId: result.data.playerId,
  };
  await saveAuthSession(session);
  return { session, error: null };
}

export async function ensureAuthenticated(
  api: ApiClient,
  nowUnix: number,
): Promise<{ session: AuthSession | null; error: string | null }> {
  const existing = await loadAuthSession();
  if (existing && isSessionValid(existing, nowUnix)) {
    return { session: existing, error: null };
  }

  if (existing?.refreshToken) {
    const refreshed = await refreshSession(api, existing, nowUnix);
    if (refreshed.session) {
      return refreshed;
    }
  }

  return createAnonymousSession(api, nowUnix);
}
