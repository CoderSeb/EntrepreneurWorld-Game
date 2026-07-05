import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, createAppState, duplicateAppState } from '@/domain/core/AppState';
import { duplicateCompanyState } from '@/domain/core/CompanyState';
import { duplicatePlayerState } from '@/domain/core/PlayerState';
import { duplicatePurchaseState } from '@/domain/core/PurchaseState';
import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { fail, ok, OperationResult } from '@/domain/core/OperationResult';
import { migrateSavePayload, SaveData, CURRENT_SCHEMA_VERSION } from '@/domain/save/SaveData';
import { saveDataFromDictionary, saveDataToDictionary } from '@/domain/save/SaveSerializer';
import { attachChecksum, verifyChecksum } from '@/domain/save/SaveIntegrityService';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { calculateConglomerateNetWorthMinor, calculatePersonalNetWorthMinor } from '@/domain/progression/ProgressionService';
import { calculateHourlyNetMinor } from '@/domain/economy/CompanyIncomeService';

const SAVE_KEY = '@business-empire/save/slot_0';
const BACKUP_KEY = '@business-empire/save/slot_0.backup';
const CLIENT_VERSION = '0.1.0';

export function buildSaveFromAppState(appState: AppState, config: EconomyConfig, nowUnix: number): SaveData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    playerId: appState.player.playerId,
    createdAtUnix: appState.createdAtUnix > 0 ? appState.createdAtUnix : nowUnix,
    lastSeenAtUnix: nowUnix,
    lastServerSeenAtUnix: -1,
    economyVersion: config.version,
    clientVersion: CLIENT_VERSION,
    player: duplicatePlayerState(appState.player),
    companies: appState.companies.map(duplicateCompanyState),
    marketState: JSON.parse(JSON.stringify(appState.marketState)),
    activityCooldowns: { ...appState.activityCooldowns },
    purchases: duplicatePurchaseState(appState.purchases),
    settings: {
      ...appState.settings,
      leaderboard_snapshot: {
        conglomerate_net_worth_minor: calculateConglomerateNetWorthMinor(appState),
        personal_net_worth_minor: calculatePersonalNetWorthMinor(appState),
        hourly_earnings_minor: calculateHourlyNetMinor(
          appState.companies,
          config,
          appState.marketState,
        ),
      },
    },
    checksum: '',
    signatureVersion: 1,
  };
}

export function applySaveToAppState(appState: AppState, saveData: SaveData): void {
  appState.player = duplicatePlayerState(saveData.player);
  appState.companies = saveData.companies.map(duplicateCompanyState);
  appState.marketState = JSON.parse(JSON.stringify(saveData.marketState));
  appState.activityCooldowns = { ...saveData.activityCooldowns };
  appState.purchases = duplicatePurchaseState(saveData.purchases);
  appState.settings = { ...saveData.settings };
  appState.economyVersion = saveData.economyVersion;
  appState.createdAtUnix = saveData.createdAtUnix;
  appState.lastSeenAtUnix = saveData.lastSeenAtUnix;
}

export async function loadGame(): Promise<OperationResult<{ saveData: SaveData | null; hasLoadedSave: boolean }>> {
  const jsonText = await AsyncStorage.getItem(SAVE_KEY);
  if (!jsonText) {
    return ok({ saveData: null, hasLoadedSave: false });
  }

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const migrated = migrateSavePayload(parsed);
    const saveData = saveDataFromDictionary(migrated);
    if (!(await verifyChecksum(saveData))) {
      return restoreBackup('save_checksum_failed', 'Primary save checksum mismatch');
    }
    return ok({ saveData, hasLoadedSave: true });
  } catch {
    return restoreBackup('save_parse_failed', 'Primary save JSON is invalid');
  }
}

async function restoreBackup(
  errorCode: string,
  errorMessage: string,
): Promise<OperationResult<{ saveData: SaveData | null; hasLoadedSave: boolean }>> {
  const backupText = await AsyncStorage.getItem(BACKUP_KEY);
  if (!backupText) {
    return fail(errorCode, errorMessage);
  }

  try {
    const parsed = JSON.parse(backupText) as Record<string, unknown>;
    const saveData = saveDataFromDictionary(migrateSavePayload(parsed));
    if (!(await verifyChecksum(saveData))) {
      return fail(errorCode, errorMessage);
    }
    return ok({ saveData, hasLoadedSave: true });
  } catch {
    return fail(errorCode, errorMessage);
  }
}

export async function saveGame(appState: AppState, config: EconomyConfig, nowUnix: number): Promise<OperationResult<SaveData>> {
  const saveData = buildSaveFromAppState(appState, config, nowUnix);
  await attachChecksum(saveData);
  const payload = saveDataToDictionary(saveData);
  const jsonText = JSON.stringify(payload);

  const existing = await AsyncStorage.getItem(SAVE_KEY);
  if (existing) {
    await AsyncStorage.setItem(BACKUP_KEY, existing);
  }

  await AsyncStorage.setItem(SAVE_KEY, jsonText);
  return ok(saveData);
}

export async function clearLocalSave(): Promise<void> {
  await AsyncStorage.multiRemove([SAVE_KEY, BACKUP_KEY]);
}

export function applyNewGameDefaults(appState: AppState, config: EconomyConfig, nowUnix: number): void {
  appState.player.playerId = appState.player.playerId || 'local-player';
  appState.player.personalCashBalance = MoneyValue.fromMinor(config.startingCashMinor);
  appState.createdAtUnix = nowUnix;
  appState.lastSeenAtUnix = nowUnix;
}

export function createFreshAppState(nowUnix: number): AppState {
  const state = createAppState();
  state.player.playerId = 'local-player';
  state.createdAtUnix = nowUnix;
  state.lastSeenAtUnix = nowUnix;
  return state;
}

export function cloneAppState(state: AppState): AppState {
  return duplicateAppState(state);
}
