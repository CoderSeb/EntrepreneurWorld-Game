import { createAppState, AppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { createPlayerState } from '@/domain/core/PlayerState';
import {
  EconomyConfig,
  getActivitiesForKind,
  getIndustry,
  parseEconomyConfig,
} from '@/domain/config/EconomyConfig';
import {
  createHoldingCompany,
  createSubsidiaryCompany,
  getActivityUnavailableRemaining,
  performActivity,
} from '@/domain/companies/CompanyService';
import { simulateTick, simulateOfflineForApp } from '@/domain/economy/EconomySimulator';
import { processCompanyProgression } from '@/domain/companies/CompanyProgressionService';
import { calculateHourlyNetMinor } from '@/domain/economy/CompanyIncomeService';
import { hireExecutiveRole, upgradeAutomation } from '@/domain/companies/ManagementService';
import { getTrackLevel, upgradeTrack } from '@/domain/companies/UpgradeTrackService';
import { isExecutiveHired } from '@/domain/companies/ExecutiveContracts';
import { CompanyState } from '@/domain/core/CompanyState';
import {
  getActivityRevenueMultiplier,
} from '@/domain/companies/ActivityEffectService';
import {
  getRevenuePerHour,
} from '@/domain/economy/EffectiveEconomyCalculator';
import economyJson from '../../../assets/config/economy_config_v1.json';

export const HOLDING_FOUND_MINUTE = 1;
export const SUBSIDIARY_FOUND_MINUTE = 2;

export type EngagedTurnOptions = {
  runActivities: boolean;
  allowCeoHire: boolean;
  allowSystemsUpgrade: boolean;
  allowTrackUpgrade: boolean;
  preCeoSingleTrackOnly: boolean;
};

export const ENGAGED_ONBOARDING_TURN: EngagedTurnOptions = {
  runActivities: true,
  allowCeoHire: true,
  allowSystemsUpgrade: true,
  allowTrackUpgrade: true,
  preCeoSingleTrackOnly: true,
};

export const ENGAGED_NO_CEO_TURN: EngagedTurnOptions = {
  runActivities: true,
  allowCeoHire: false,
  allowSystemsUpgrade: false,
  allowTrackUpgrade: false,
  preCeoSingleTrackOnly: false,
};

export function loadBundledEconomyConfig(): EconomyConfig {
  return parseEconomyConfig(economyJson as never);
}

export function createFreshAppState(config: EconomyConfig): AppState {
  const state = createAppState();
  state.player = createPlayerState();
  state.player.personalCashBalance = MoneyValue.fromMinor(config.startingCashMinor);
  return state;
}

export function onboardCafe(
  state: AppState,
  config: EconomyConfig,
  nowUnix: number,
): void {
  createHoldingCompany(state, config, 'Orbit Holdings', nowUnix);
  createSubsidiaryCompany(state, config, 'cafe', 'Morning Brew', nowUnix);
}

export function getPrimarySubsidiary(state: AppState): CompanyState | undefined {
  return state.companies.find((company) => company.companyKind === 'subsidiary');
}

export function runEngagedTurn(
  state: AppState,
  config: EconomyConfig,
  nowUnix: number,
  options: EngagedTurnOptions,
): void {
  const subsidiary = getPrimarySubsidiary(state);
  if (!subsidiary) {
    return;
  }

  if (options.runActivities) {
    for (const activity of getActivitiesForKind(config, subsidiary.companyKind)) {
      if (getActivityUnavailableRemaining(state, subsidiary, activity.id, nowUnix) > 0) {
        continue;
      }
      performActivity(state, config, subsidiary, activity, nowUnix);
    }
  }

  const industry = getIndustry(config, subsidiary.industryId);
  const ceoHired = isExecutiveHired(subsidiary, 'ceo', nowUnix);
  const preferredTrackId = industry?.preferredTrackId;

  if (options.allowTrackUpgrade && preferredTrackId) {
    const trackLevel = getTrackLevel(subsidiary, preferredTrackId);
    if (options.preCeoSingleTrackOnly && !ceoHired && trackLevel < 1) {
      upgradeTrack(state, subsidiary.id, preferredTrackId, config, nowUnix);
    } else if (!options.preCeoSingleTrackOnly || ceoHired) {
      upgradeTrack(state, subsidiary.id, preferredTrackId, config, nowUnix);
    }
  }

  if (options.allowCeoHire && !ceoHired) {
    hireExecutiveRole(state, config, subsidiary.id, 'ceo', nowUnix);
  }

  if (options.allowSystemsUpgrade && ceoHired) {
    upgradeAutomation(state, config, subsidiary.id, nowUnix);
  }
}

export function runActiveMinute(
  state: AppState,
  config: EconomyConfig,
  tickSeconds: number,
  nowUnix: number,
  engaged?: EngagedTurnOptions,
): void {
  simulateTick(state.player, state.companies, tickSeconds, config, state.marketState);
  if (engaged) {
    runEngagedTurn(state, config, nowUnix, engaged);
  }
  processCompanyProgression(state, config, tickSeconds, nowUnix);
}

export function runOfflineLikeApp(
  state: AppState,
  config: EconomyConfig,
  offlineSeconds: number,
  periodEndUnix: number,
): number {
  const result = simulateOfflineForApp(state, offlineSeconds, config);
  const progressionSeconds = Math.max(0, Math.round(result.effectiveHours * 3600));
  processCompanyProgression(state, config, progressionSeconds, periodEndUnix);
  return progressionSeconds;
}

export function measureActivityContribution(
  company: CompanyState,
  config: EconomyConfig,
  marketState: AppState['marketState'],
  subsidiaries: CompanyState[],
  nowUnix: number,
): { revenueShare: number; revenueMultiplier: number } {
  const withActivity = getRevenuePerHour(
    company,
    config,
    marketState,
    subsidiaries,
    nowUnix,
  ).amountMinorUnits;
  const savedEffects = company.activeEffects;
  company.activeEffects = [];
  const withoutActivity = getRevenuePerHour(
    company,
    config,
    marketState,
    subsidiaries,
    nowUnix,
  ).amountMinorUnits;
  company.activeEffects = savedEffects;

  const revenueMultiplier = getActivityRevenueMultiplier(company, nowUnix);
  const revenueShare =
    withActivity > 0 ? Math.max(0, (withActivity - withoutActivity) / withActivity) : 0;

  return { revenueShare, revenueMultiplier };
}

export function hasPurchasedUpgrade(company: CompanyState): boolean {
  if (company.automationLevel > 0) {
    return true;
  }
  return Object.values(company.upgradeTrackLevels).some((level) => level > 0);
}

export function portfolioHourlyNetMinor(
  state: AppState,
  config: EconomyConfig,
): number {
  return calculateHourlyNetMinor(state.companies, config, state.marketState);
}
