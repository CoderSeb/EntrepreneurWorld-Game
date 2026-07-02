import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState as RNAppState, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppState } from '@/domain/core/AppState';
import { loadEconomyConfig } from '@/domain/config/loadEconomyConfig';
import { EconomyConfig } from '@/domain/config/EconomyConfig';
import {
  applyNewGameDefaults,
  applySaveToAppState,
  createFreshAppState,
  loadGame,
  saveGame,
} from '@/domain/save/SaveService';
import { refreshEvents } from '@/domain/market/MarketEventService';
import { simulateOfflineForApp, simulateTick } from '@/domain/economy/EconomySimulator';
import { accrueLoanInterest, hireExecutiveRole, repayLoan, takeLoan, upgradeAutomation } from '@/domain/companies/ManagementService';
import { processCompanyProgression } from '@/domain/companies/CompanyProgressionService';
import {
  createHoldingCompany,
  createSubsidiaryCompany,
  performActivity,
} from '@/domain/companies/CompanyService';
import { getActivity } from '@/domain/config/EconomyConfig';
import { upgradeTrack } from '@/domain/companies/UpgradeTrackService';
import { SimulationResult } from '@/domain/economy/SimulationResult';
import { buildDashboardViewModel, buildMarketViewModel } from '@/domain/viewModels/ViewModels';
import {
  buildCompanyExecutiveRoles,
  buildCompanyUiModels,
  buildTaskUiModels,
} from '@/domain/viewModels/CompanyUiModel';
import { findCompany } from '@/domain/core/AppState';
import { OperationResult } from '@/domain/core/OperationResult';
import { SaveData } from '@/domain/save/SaveData';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { guardOfflineDuration } from '@/domain/security/TimeManipulationGuard';
import { t } from '@/i18n';
import { isBackendEnabled } from '@/config/backendConfig';
import {
  BackendStatus,
  requestAccountDeletion as submitAccountDeletionRequest,
  runBackendBootstrap,
  syncCloudSaveNow,
  uploadCloudSaveIfNeeded,
} from '@/services/backend/BackendBootstrapService';
import { AuthSession } from '@/services/auth/authSessionStore';
import {
  DISPLAY_CURRENCY_SETTING_KEY,
  DisplayCurrencyCode,
  formatMoney,
  formatMoneyCompact,
  getDisplayCurrencyFromSettings,
  setActiveDisplayCurrency,
} from '@/domain/money/MoneyFormatter';

const TICK_SECONDS = 1;
const OFFLINE_THRESHOLD_SECONDS = 60;
const AUTO_SAVE_INTERVAL_SECONDS = 30;
const MARKET_REFRESH_SECONDS = 300;

type OfflineSummary = {
  result: SimulationResult;
  offlineSeconds: number;
};

type SyncResult = {
  success: boolean;
  message: string;
};

function createInitialBackendStatus(): BackendStatus {
  return {
    enabled: isBackendEnabled(),
    connected: false,
    playerId: null,
    profileStatus: null,
    cloudSaveEnabled: false,
    economyConfigSource: 'bundled',
    lastSyncAtUnix: null,
    lastError: null,
    welcomeTitle: null,
  };
}

type GameContextValue = {
  ready: boolean;
  config: EconomyConfig;
  backendStatus: BackendStatus;
  dashboard: ReturnType<typeof buildDashboardViewModel>;
  market: ReturnType<typeof buildMarketViewModel>;
  companies: ReturnType<typeof buildCompanyUiModels>;
  tasks: ReturnType<typeof buildTaskUiModels>;
  offlineSummary: OfflineSummary | null;
  dismissOfflineSummary: () => void;
  completeOnboarding: (holdingName: string, companyName: string, industryId: string) => OperationResult;
  foundSubsidiary: (companyName: string, industryId: string) => OperationResult;
  performCompanyActivity: (companyId: string, activityId: string) => OperationResult;
  hireExecutiveRole: (companyId: string, roleId: string) => OperationResult;
  getCompanyExecutiveRoles: (companyId: string) => ReturnType<typeof buildCompanyExecutiveRoles>;
  upgradeCompanyTrack: (companyId: string, trackId: string) => OperationResult;
  upgradeCompanyAutomation: (companyId: string) => OperationResult;
  borrowLoan: (productId: string, amountMinor: number) => OperationResult;
  repayLoanById: (loanId: string) => OperationResult;
  saveNow: () => Promise<void>;
  syncCloudNow: () => Promise<SyncResult>;
  requestAccountDeletion: () => Promise<SyncResult>;
  getCompanyById: (companyId: string) => ReturnType<typeof buildCompanyUiModels>[number] | null;
  activeLoans: AppState['player']['activeLoans'];
  playerCashMinor: number;
  displayCurrency: DisplayCurrencyCode;
  setDisplayCurrency: (currency: DisplayCurrencyCode) => void;
  formatMoneyCompact: (minorUnits: number) => string;
  formatMoney: (minorUnits: number) => string;
};

const GameContext = createContext<GameContextValue | null>(null);

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function applyEntitlementsToAppState(state: AppState, entitlements: string[], now: number): void {
  if (entitlements.length === 0) {
    return;
  }
  state.purchases.entitlements = [...new Set([...state.purchases.entitlements, ...entitlements])];
  state.purchases.lastValidatedAtUnix = now;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<EconomyConfig>(() => loadEconomyConfig());
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(createInitialBackendStatus);
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrencyCode>('USD');
  const appStateRef = useRef<AppState>(createFreshAppState(nowUnix()));
  const sessionRef = useRef<AuthSession | null>(null);
  const backendStatusRef = useRef<BackendStatus>(createInitialBackendStatus());
  const marketRefreshRef = useRef(0);
  const hasIncomeCompaniesRef = useRef(false);

  const bump = useCallback(() => setTick((value) => value + 1), []);

  const syncToCloud = useCallback(async (saveData: SaveData) => {
    const session = sessionRef.current;
    const status = backendStatusRef.current;
    if (!session || !status.cloudSaveEnabled) {
      return;
    }

    const uploaded = await uploadCloudSaveIfNeeded(saveData, session, status.cloudSaveEnabled);
    if (uploaded) {
      const syncedAt = nowUnix();
      backendStatusRef.current = { ...backendStatusRef.current, lastSyncAtUnix: syncedAt, lastError: null };
      setBackendStatus((prev) => ({ ...prev, lastSyncAtUnix: syncedAt, lastError: null }));
    }
  }, []);

  const persistGame = useCallback(async () => {
    const result = await saveGame(appStateRef.current, config, nowUnix());
    if (result.success) {
      await syncToCloud(result.data);
    }
    return result;
  }, [config, syncToCloud]);

  const bootstrap = useCallback(async () => {
    const now = nowUnix();
    const loadResult = await loadGame();
    const localSave =
      loadResult.success && loadResult.data.hasLoadedSave ? loadResult.data.saveData : null;
    const localHasSave = Boolean(loadResult.success && loadResult.data.hasLoadedSave);

    const backend = await runBackendBootstrap(localSave, localHasSave, now);
    setConfig(backend.economyConfig);
    sessionRef.current = backend.session;
    backendStatusRef.current = backend.status;
    setBackendStatus(backend.status);

    const state = appStateRef.current;
    const activeConfig = backend.economyConfig;

    if (backend.hasLoadedSave && backend.saveData) {
      applySaveToAppState(state, backend.saveData);
    } else {
      applyNewGameDefaults(state, activeConfig, now);
    }

    if (backend.session?.playerId) {
      state.player.playerId = backend.session.playerId;
    }

    applyEntitlementsToAppState(state, backend.entitlements, now);

    const offlineGuard = guardOfflineDuration(
      state.lastSeenAtUnix,
      now,
      activeConfig.maxOfflineHoursRewarded,
    );
    const offlineSeconds = offlineGuard.offlineSeconds;
    hasIncomeCompaniesRef.current = state.companies.some((c) => c.companyKind === 'subsidiary');

    if (offlineSeconds >= OFFLINE_THRESHOLD_SECONDS) {
      if (hasIncomeCompaniesRef.current) {
        const result = simulateOfflineForApp(state, offlineSeconds, activeConfig);
        processCompanyProgression(state, activeConfig, offlineSeconds, now);
        setOfflineSummary({ result, offlineSeconds });
      }
      accrueLoanInterest(state, offlineSeconds);
    }

    state.lastSeenAtUnix = now;
    refreshEvents(state, activeConfig, now);
    setDisplayCurrencyState(getDisplayCurrencyFromSettings(state.settings));
    setActiveDisplayCurrency(getDisplayCurrencyFromSettings(state.settings));
    setReady(true);
    bump();
  }, [bump]);

  useEffect(() => {
    bootstrap().catch(() => {
      applyNewGameDefaults(appStateRef.current, loadEconomyConfig(), nowUnix());
      setReady(true);
      bump();
    });
  }, [bootstrap, bump]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const interval = setInterval(() => {
      const state = appStateRef.current;
      hasIncomeCompaniesRef.current = state.companies.some((c) => c.companyKind === 'subsidiary');
      if (!hasIncomeCompaniesRef.current) {
        return;
      }

      simulateTick(state.player, state.companies, TICK_SECONDS, config, state.marketState);
      accrueLoanInterest(state, TICK_SECONDS);
      processCompanyProgression(state, config, TICK_SECONDS, nowUnix());

      marketRefreshRef.current += TICK_SECONDS;
      if (marketRefreshRef.current >= MARKET_REFRESH_SECONDS) {
        marketRefreshRef.current = 0;
        refreshEvents(state, config, nowUnix());
      }

      state.lastSeenAtUnix = nowUnix();
      bump();
    }, TICK_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [ready, bump, config]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const interval = setInterval(() => {
      persistGame().catch(() => undefined);
    }, AUTO_SAVE_INTERVAL_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [ready, persistGame]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const subscription = RNAppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        persistGame().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [ready, persistGame]);

  const mutate = useCallback(
    (runner: () => OperationResult): OperationResult => {
      const result = runner();
      if (result.success) {
        bump();
        persistGame().catch(() => undefined);
      }
      return result;
    },
    [bump, persistGame],
  );

  const setDisplayCurrency = useCallback(
    (currency: DisplayCurrencyCode) => {
      appStateRef.current.settings[DISPLAY_CURRENCY_SETTING_KEY] = currency;
      setDisplayCurrencyState(currency);
      setActiveDisplayCurrency(currency);
      bump();
      persistGame().catch(() => undefined);
    },
    [bump, persistGame],
  );

  useEffect(() => {
    setActiveDisplayCurrency(displayCurrency);
  }, [displayCurrency]);

  const value = useMemo((): GameContextValue => {
    void tick;
    const state = appStateRef.current;
    const now = nowUnix();
    const dashboard = buildDashboardViewModel(state, config);
    const companies = buildCompanyUiModels(state, config, now);

    return {
      ready,
      config,
      backendStatus,
      dashboard,
      market: buildMarketViewModel(state, now),
      companies,
      tasks: buildTaskUiModels(state, config, now),
      offlineSummary,
      dismissOfflineSummary: () => setOfflineSummary(null),
      completeOnboarding: (holdingName, companyName, industryId) =>
        mutate(() => {
          const holdingResult = createHoldingCompany(state, config, holdingName, now);
          if (!holdingResult.success) {
            return holdingResult;
          }
          return createSubsidiaryCompany(state, config, industryId, companyName, now);
        }),
      foundSubsidiary: (companyName, industryId) =>
        mutate(() => createSubsidiaryCompany(state, config, industryId, companyName, now)),
      performCompanyActivity: (companyId, activityId) =>
        mutate(() => {
          const company = findCompany(state, companyId);
          if (!company) {
            return { success: false, errorCode: 'company_not_found', errorMessage: 'Company not found' };
          }
          const activity = getActivity(config, activityId);
          if (!activity) {
            return { success: false, errorCode: 'unknown_activity', errorMessage: 'Activity not found' };
          }
          return performActivity(state, company, activity, now);
        }),
      hireExecutiveRole: (companyId, roleId) =>
        mutate(() => hireExecutiveRole(state, config, companyId, roleId, now)),
      getCompanyExecutiveRoles: (companyId) => buildCompanyExecutiveRoles(state, config, companyId),
      upgradeCompanyTrack: (companyId, trackId) =>
        mutate(() => upgradeTrack(state, companyId, trackId, config, now)),
      upgradeCompanyAutomation: (companyId) =>
        mutate(() => upgradeAutomation(state, config, companyId, now)),
      borrowLoan: (productId, amountMinor) =>
        mutate(() => takeLoan(state, config, productId, amountMinor, now)),
      repayLoanById: (loanId) => mutate(() => repayLoan(state, loanId)),
      saveNow: async () => {
        await persistGame();
      },
      syncCloudNow: async () => {
        const session = sessionRef.current;
        if (!session) {
          return { success: false, message: 'Not signed in to backend' };
        }
        if (!backendStatusRef.current.cloudSaveEnabled) {
          return { success: false, message: 'Cloud save is disabled' };
        }

        const saveResult = await saveGame(state, config, nowUnix());
        if (!saveResult.success) {
          return { success: false, message: 'Local save failed' };
        }

        const result = await syncCloudSaveNow(saveResult.data, session);
        if (result.success && result.lastSyncAtUnix) {
          backendStatusRef.current = {
            ...backendStatusRef.current,
            lastSyncAtUnix: result.lastSyncAtUnix,
            lastError: null,
          };
          setBackendStatus((prev) => ({
            ...prev,
            lastSyncAtUnix: result.lastSyncAtUnix,
            lastError: null,
          }));
        } else if (!result.success) {
          setBackendStatus((prev) => ({ ...prev, lastError: result.message }));
        }

        return { success: result.success, message: result.message };
      },
      requestAccountDeletion: async () => {
        const session = sessionRef.current;
        if (!session) {
          return { success: false, message: 'Not signed in to backend' };
        }
        const result = await submitAccountDeletionRequest(session);
        return { success: result.success, message: result.message };
      },
      getCompanyById: (companyId) => companies.find((c) => c.id === companyId) ?? null,
      activeLoans: [...state.player.activeLoans],
      playerCashMinor: state.player.cashBalance.amountMinorUnits,
      displayCurrency,
      setDisplayCurrency,
      formatMoneyCompact: (minorUnits: number) => formatMoneyCompact(minorUnits, displayCurrency),
      formatMoney: (minorUnits: number) => formatMoney(minorUnits, displayCurrency),
    };
  }, [tick, ready, config, backendStatus, offlineSummary, mutate, persistGame, displayCurrency, setDisplayCurrency]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={styles.bootScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.bootText}>{t().common.loading}</Text>
      </View>
    );
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bootText: {
    fontFamily: fonts.display,
    fontSize: fontSizes.sm,
    color: colors.muted,
    letterSpacing: 2,
  },
});

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within GameProvider');
  }
  return ctx;
}

/** @deprecated Use useGame */
export const useSession = useGame;
