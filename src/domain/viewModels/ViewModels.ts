import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { AppState } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { calculateHourlyNetMinor } from '@/domain/economy/CompanyIncomeService';
import {
  calculateConglomerateNetWorthMinor,
  calculateNetWorthMinor,
  calculatePersonalNetWorthMinor,
} from '@/domain/progression/ProgressionService';
import { getMaxCompaniesForLevel } from '@/domain/config/EconomyConfig';
import { findHoldingCompany, sumConglomerateLiquidCashMinor } from '@/domain/treasury/CompanyTreasury';

export type DashboardViewModel = {
  personalCash: MoneyValue;
  holdingCash: MoneyValue;
  conglomerateLiquidCash: MoneyValue;
  hourlyNet: MoneyValue;
  holding: CompanyState | null;
  subsidiaries: CompanyState[];
  hasHolding: boolean;
  subsidiaryCount: number;
  maxSubsidiaries: number;
  businessRank: number;
  conglomerateNetWorth: MoneyValue;
  personalNetWorth: MoneyValue;
  netWorth: MoneyValue;
  onboardingCompleted: boolean;
  conglomerateName: string;
};

export function buildDashboardViewModel(
  appState: AppState,
  config: EconomyConfig,
): DashboardViewModel {
  let hourlyNet = MoneyValue.zero();
  let holding: CompanyState | null = null;
  const subsidiaries: CompanyState[] = [];

  for (const company of appState.companies) {
    if (company.companyKind === 'holding') {
      holding = company;
    } else {
      subsidiaries.push(company);
    }
  }

  const hourlyNetMinor = calculateHourlyNetMinor(
    appState.companies,
    config,
    appState.marketState,
  );
  hourlyNet = MoneyValue.fromMinor(hourlyNetMinor);

  const resolvedHolding = holding ?? findHoldingCompany(appState);

  return {
    personalCash: appState.player.personalCashBalance,
    holdingCash: resolvedHolding?.cashBalance ?? MoneyValue.zero(),
    conglomerateLiquidCash: MoneyValue.fromMinor(sumConglomerateLiquidCashMinor(appState)),
    hourlyNet,
    holding: resolvedHolding,
    subsidiaries,
    hasHolding: appState.player.holdingCompanyId.length > 0,
    subsidiaryCount: subsidiaries.length,
    maxSubsidiaries: getMaxCompaniesForLevel(config, appState.player.businessRank),
    businessRank: appState.player.businessRank,
    conglomerateNetWorth: MoneyValue.fromMinor(calculateConglomerateNetWorthMinor(appState)),
    personalNetWorth: MoneyValue.fromMinor(calculatePersonalNetWorthMinor(appState)),
    netWorth: MoneyValue.fromMinor(calculateNetWorthMinor(appState)),
    onboardingCompleted: appState.player.onboardingCompleted,
    conglomerateName: resolvedHolding?.name ?? '',
  };
}

export type MarketEventViewModel = {
  id: string;
  displayName: string;
  revenueMultiplier: number;
  expenseMultiplier: number;
  remainingHours: number;
  global: boolean;
  affectedIndustryIds: string[];
};

export function buildMarketViewModel(appState: AppState, nowUnix: number) {
  const events: MarketEventViewModel[] = [];
  for (const eventPayload of appState.marketState.active_events ?? []) {
    const endsAt = eventPayload.ends_at_unix ?? 0;
    const remainingHours = Math.max(0, (endsAt - nowUnix) / 3600);
    const affected = eventPayload.affects_industry_ids ?? [];
    events.push({
      id: eventPayload.id ?? '',
      displayName: eventPayload.display_name ?? 'Event',
      revenueMultiplier: eventPayload.revenue_multiplier ?? 1,
      expenseMultiplier: eventPayload.expense_multiplier ?? 1,
      remainingHours,
      global: affected.length === 0,
      affectedIndustryIds: affected,
    });
  }
  return { events };
}
