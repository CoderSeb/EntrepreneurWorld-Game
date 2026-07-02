import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** SecureStore allows only [A-Za-z0-9._-] — not @ or / */
const SESSION_KEY = 'business_empire.auth.session';
const DEVICE_ID_KEY = 'business_empire.auth.device_id';

/** Legacy AsyncStorage keys (web / pre-fix native attempts) */
const LEGACY_SESSION_KEY = '@business-empire/auth/session';
const LEGACY_DEVICE_ID_KEY = '@business-empire/auth/device-id';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAtUnix: number;
  playerId: string;
};

async function readSecure(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function writeSecure(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteSecure(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function readWithLegacyMigration(key: string, legacyKey: string): Promise<string | null> {
  const current = await readSecure(key);
  if (current) {
    return current;
  }

  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy) {
    return null;
  }

  await writeSecure(key, legacy);
  await AsyncStorage.removeItem(legacyKey);
  return legacy;
}

export async function loadAuthSession(): Promise<AuthSession | null> {
  const raw = await readWithLegacyMigration(SESSION_KEY, LEGACY_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await writeSecure(SESSION_KEY, JSON.stringify(session));
}

export async function clearAuthSession(): Promise<void> {
  await deleteSecure(SESSION_KEY);
  await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
}

export function isSessionValid(session: AuthSession, nowUnix: number): boolean {
  return session.expiresAtUnix > nowUnix + 30;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await readWithLegacyMigration(DEVICE_ID_KEY, LEGACY_DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const generated = Crypto.randomUUID();
  await writeSecure(DEVICE_ID_KEY, generated);
  return generated;
}
