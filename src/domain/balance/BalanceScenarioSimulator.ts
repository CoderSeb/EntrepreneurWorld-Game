import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { createSubsidiaryCompany } from '@/domain/companies/CompanyService';
import { getIndustryFoundingCost } from '@/domain/config/EconomyConfig';
import { isExecutiveHired } from '@/domain/companies/ExecutiveContracts';
import { hireExecutiveRole } from '@/domain/companies/ManagementService';
import { availableFundingForFoundingMinor } from '@/domain/treasury/CompanyTreasury';
import {
  createFreshAppState,
  ENGAGED_NO_CEO_TURN,
  ENGAGED_ONBOARDING_TURN,
  getPrimarySubsidiary,
  loadBundledEconomyConfig,
  measureActivityContribution,
  onboardCafe,
  portfolioHourlyNetMinor,
  runActiveMinute,
  runOfflineLikeApp,
  SUBSIDIARY_FOUND_MINUTE,
} from '@/domain/balance/BalanceSimulationCore';

export type BalanceGuardrails = {
  maxActivityRevenueShare: number;
  maxCombinedActivityRevenueMultiplier: number;
  minHourlyNetMinor: number;
};

export const DEFAULT_BALANCE_GUARDRAILS: BalanceGuardrails = {
  maxActivityRevenueShare: 0.35,
  maxCombinedActivityRevenueMultiplier: 1.35,
  minHourlyNetMinor: 1,
};

export type BalanceScenarioId =
  | 'passive_offline_1h'
  | 'passive_offline_8h'
  | 'passive_offline_72h'
  | 'engaged_active_no_ceo'
  | 'ceo_offline_8h'
  | 'ceo_offline_72h'
  | 'multi_industry_portfolio';

export type BalanceScenarioReport = {
  scenarioId: BalanceScenarioId;
  offlineHours: number;
  activeMinutes: number;
  hourlyNetMinor: number;
  activityRevenueShare: number;
  activityRevenueMultiplier: number;
  subsidiaryCount: number;
  warnings: string[];
};

function evaluateActivityGuards(
  report: BalanceScenarioReport,
  guardrails: BalanceGuardrails,
): void {
  if (report.hourlyNetMinor < guardrails.minHourlyNetMinor) {
    report.warnings.push('negative_hourly_net');
  }
  if (report.activityRevenueShare > guardrails.maxActivityRevenueShare) {
    report.warnings.push('activity_revenue_share_too_high');
  }
  if (report.activityRevenueMultiplier > guardrails.maxCombinedActivityRevenueMultiplier) {
    report.warnings.push('activity_revenue_multiplier_too_high');
  }
}

function buildScenarioBase(
  scenarioId: BalanceScenarioId,
  offlineHours: number,
  activeMinutes: number,
): BalanceScenarioReport {
  return {
    scenarioId,
    offlineHours,
    activeMinutes,
    hourlyNetMinor: 0,
    activityRevenueShare: 0,
    activityRevenueMultiplier: 1,
    subsidiaryCount: 0,
    warnings: [],
  };
}

function attachPortfolioMetrics(
  report: BalanceScenarioReport,
  state: ReturnType<typeof createFreshAppState>,
  config: EconomyConfig,
  nowUnix: number,
): void {
  const subsidiary = getPrimarySubsidiary(state);
  report.subsidiaryCount = state.companies.filter((company) => company.companyKind === 'subsidiary').length;
  report.hourlyNetMinor = portfolioHourlyNetMinor(state, config);

  if (subsidiary) {
    const activity = measureActivityContribution(
      subsidiary,
      config,
      state.marketState,
      state.companies,
      nowUnix,
    );
    report.activityRevenueShare = activity.revenueShare;
    report.activityRevenueMultiplier = activity.revenueMultiplier;
  }
}

function simulatePassiveOffline(
  scenarioId: BalanceScenarioId,
  offlineHours: number,
  guardrails: BalanceGuardrails,
): BalanceScenarioReport {
  const config = loadBundledEconomyConfig();
  const state = createFreshAppState(config);
  const report = buildScenarioBase(scenarioId, offlineHours, SUBSIDIARY_FOUND_MINUTE);

  let nowUnix = 1_700_000_000;
  onboardCafe(state, config, (nowUnix += 60));

  const offlineSeconds = offlineHours * 3600;
  runOfflineLikeApp(state, config, offlineSeconds, nowUnix + offlineSeconds);

  attachPortfolioMetrics(report, state, config, nowUnix + offlineSeconds);
  if (report.activityRevenueShare > 0.001) {
    report.warnings.push('unexpected_activity_effects_while_passive');
  }
  evaluateActivityGuards(report, guardrails);
  return report;
}

function simulateEngagedNoCeo(
  guardrails: BalanceGuardrails,
  activeMinutes = 90,
): BalanceScenarioReport {
  const config = loadBundledEconomyConfig();
  const state = createFreshAppState(config);
  const report = buildScenarioBase('engaged_active_no_ceo', 0, activeMinutes);

  const tickSeconds = 60;
  let nowUnix = 1_700_000_000;
  onboardCafe(state, config, (nowUnix += 60));

  for (let minute = SUBSIDIARY_FOUND_MINUTE + 1; minute <= activeMinutes; minute += 1) {
    nowUnix += tickSeconds;
    runActiveMinute(state, config, tickSeconds, nowUnix, ENGAGED_NO_CEO_TURN);
  }

  attachPortfolioMetrics(report, state, config, nowUnix);
  evaluateActivityGuards(report, guardrails);
  return report;
}

function simulateCeoOffline(
  scenarioId: 'ceo_offline_8h' | 'ceo_offline_72h',
  offlineHours: number,
  guardrails: BalanceGuardrails,
): BalanceScenarioReport {
  const config = loadBundledEconomyConfig();
  const state = createFreshAppState(config);
  const report = buildScenarioBase(scenarioId, offlineHours, 120);

  const tickSeconds = 60;
  let nowUnix = 1_700_000_000;
  onboardCafe(state, config, (nowUnix += 60));

  for (let minute = SUBSIDIARY_FOUND_MINUTE + 1; minute <= 120; minute += 1) {
    nowUnix += tickSeconds;
    runActiveMinute(state, config, tickSeconds, nowUnix, ENGAGED_ONBOARDING_TURN);
  }

  const subsidiary = getPrimarySubsidiary(state);
  if (subsidiary && !isExecutiveHired(subsidiary, 'ceo', nowUnix)) {
    hireExecutiveRole(state, config, subsidiary.id, 'ceo', nowUnix);
  }

  const offlineSeconds = offlineHours * 3600;
  runOfflineLikeApp(state, config, offlineSeconds, nowUnix + offlineSeconds);

  attachPortfolioMetrics(report, state, config, nowUnix + offlineSeconds);
  evaluateActivityGuards(report, guardrails);
  return report;
}

function simulateMultiIndustryPortfolio(
  guardrails: BalanceGuardrails,
  maxActiveMinutes = 1_800,
): BalanceScenarioReport {
  const config = loadBundledEconomyConfig();
  const state = createFreshAppState(config);
  const report = buildScenarioBase('multi_industry_portfolio', 0, maxActiveMinutes);

  const tickSeconds = 60;
  let nowUnix = 1_700_000_000;
  onboardCafe(state, config, (nowUnix += 60));

  const cleaningIndustry = config.industries.cleaning;
  const cleaningCost = cleaningIndustry ? getIndustryFoundingCost(cleaningIndustry, config) : Number.MAX_SAFE_INTEGER;
  let secondFounded = false;

  for (let minute = SUBSIDIARY_FOUND_MINUTE + 1; minute <= maxActiveMinutes; minute += 1) {
    nowUnix += tickSeconds;
    runActiveMinute(state, config, tickSeconds, nowUnix, ENGAGED_ONBOARDING_TURN);

    if (!secondFounded && cleaningIndustry) {
      const subsidiaries = state.companies.filter((company) => company.companyKind === 'subsidiary');
      if (
        subsidiaries.length < 2
        && availableFundingForFoundingMinor(state) >= cleaningCost
      ) {
        const result = createSubsidiaryCompany(state, config, 'cleaning', 'Sparkle Co', nowUnix);
        if (result.success) {
          secondFounded = true;
        }
      }
    }
  }

  attachPortfolioMetrics(report, state, config, nowUnix);
  if (!secondFounded) {
    report.warnings.push('second_subsidiary_not_founded');
  }
  if (report.subsidiaryCount < 2) {
    report.warnings.push('portfolio_not_diversified');
  }
  evaluateActivityGuards(report, guardrails);
  return report;
}

export function simulateBalanceScenario(
  scenarioId: BalanceScenarioId,
  guardrails: BalanceGuardrails = DEFAULT_BALANCE_GUARDRAILS,
): BalanceScenarioReport {
  switch (scenarioId) {
    case 'passive_offline_1h':
      return simulatePassiveOffline(scenarioId, 1, guardrails);
    case 'passive_offline_8h':
      return simulatePassiveOffline(scenarioId, 8, guardrails);
    case 'passive_offline_72h':
      return simulatePassiveOffline(scenarioId, 72, guardrails);
    case 'engaged_active_no_ceo':
      return simulateEngagedNoCeo(guardrails);
    case 'ceo_offline_8h':
      return simulateCeoOffline(scenarioId, 8, guardrails);
    case 'ceo_offline_72h':
      return simulateCeoOffline(scenarioId, 72, guardrails);
    case 'multi_industry_portfolio':
      return simulateMultiIndustryPortfolio(guardrails);
    default: {
      const exhaustive: never = scenarioId;
      throw new Error(`Unknown balance scenario: ${exhaustive}`);
    }
  }
}

export function simulateAllBalanceScenarios(
  guardrails: BalanceGuardrails = DEFAULT_BALANCE_GUARDRAILS,
): BalanceScenarioReport[] {
  const scenarios: BalanceScenarioId[] = [
    'passive_offline_1h',
    'passive_offline_8h',
    'passive_offline_72h',
    'engaged_active_no_ceo',
    'ceo_offline_8h',
    'ceo_offline_72h',
    'multi_industry_portfolio',
  ];

  return scenarios.map((scenarioId) => simulateBalanceScenario(scenarioId, guardrails));
}
