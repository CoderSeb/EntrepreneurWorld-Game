import { EconomyConfig, getActivitiesForKind, getIndustry, getManager } from '@/domain/config/EconomyConfig';
import { AppState } from '@/domain/core/AppState';
import { CompanyState, isHolding } from '@/domain/core/CompanyState';
import { applyLevelUpgrade } from '@/domain/economy/UpgradeCalculator';
import { getExpensesPerHour, getRevenuePerHour } from '@/domain/economy/EffectiveEconomyCalculator';
import { isExecutiveHired } from '@/domain/companies/ExecutiveRoles';
import { applyRankIfImproved } from '@/domain/progression/ProgressionService';
import { MoneyValue } from '@/domain/money/MoneyValue';

export function getAutoLevelThresholdMinor(company: CompanyState, baseRevenuePerHourMinor: number): number {
  return Math.max(25_000, baseRevenuePerHourMinor * company.level * 8);
}

export function countAutomatedActivityRuns(
  readyAtUnix: number,
  periodStartUnix: number,
  periodEndUnix: number,
  cooldownSeconds: number,
): { runCount: number; nextReadyAtUnix: number } {
  if (cooldownSeconds <= 0 || periodEndUnix <= periodStartUnix) {
    return { runCount: 0, nextReadyAtUnix: readyAtUnix };
  }

  const firstRunAt = Math.max(periodStartUnix, readyAtUnix);
  if (firstRunAt > periodEndUnix) {
    return { runCount: 0, nextReadyAtUnix: readyAtUnix };
  }

  const windowSeconds = periodEndUnix - firstRunAt;
  const runCount = 1 + Math.floor(windowSeconds / cooldownSeconds);
  return {
    runCount,
    nextReadyAtUnix: firstRunAt + runCount * cooldownSeconds,
  };
}

export function processCompanyProgression(
  appState: AppState,
  config: EconomyConfig,
  deltaSeconds: number,
  nowUnix: number,
): void {
  const hours = deltaSeconds / 3600;
  const periodStartUnix = nowUnix - deltaSeconds;

  const subsidiaries = appState.companies.filter((entry) => entry.companyKind === 'subsidiary');

  for (const company of appState.companies) {
    if (isHolding(company)) {
      continue;
    }

    const industry = getIndustry(config, company.industryId);
    if (!industry) {
      continue;
    }

    const revenue = getRevenuePerHour(company, config, appState.marketState, subsidiaries);
    const expenses = getExpensesPerHour(company, config, appState.marketState);
    const profitMinor = Math.max(0, revenue.subtract(expenses).amountMinorUnits * hours);
    company.lifetimeProfitMinor += Math.round(profitMinor);

    while (company.lifetimeProfitMinor >= getAutoLevelThresholdMinor(company, industry.baseRevenuePerHourMinor)) {
      company.lifetimeProfitMinor -= getAutoLevelThresholdMinor(company, industry.baseRevenuePerHourMinor);
      const upgraded = applyLevelUpgrade(company, industry, nowUnix);
      Object.assign(company, upgraded);
    }

    runAutomatedExecutiveTasks(appState, config, company, periodStartUnix, nowUnix);
  }

  applyRankIfImproved(appState, config);
}

function runAutomatedExecutiveTasks(
  appState: AppState,
  config: EconomyConfig,
  company: CompanyState,
  periodStartUnix: number,
  periodEndUnix: number,
): void {
  const hasAutomation = config.managers.some((role) => {
    if (!isExecutiveHired(company, role.id)) {
      return false;
    }
    return getManager(config, role.id)?.automatesTasks ?? false;
  });

  if (!hasAutomation) {
    return;
  }

  for (const activity of getActivitiesForKind(config, company.companyKind)) {
    const cooldownKey = `${company.id}:${activity.id}`;
    const readyAt = appState.activityCooldowns[cooldownKey] ?? 0;
    const { runCount, nextReadyAtUnix } = countAutomatedActivityRuns(
      readyAt,
      periodStartUnix,
      periodEndUnix,
      activity.cooldownSeconds,
    );

    if (runCount <= 0) {
      continue;
    }

    appState.player.cashBalance = appState.player.cashBalance.add(
      MoneyValue.fromMinor(activity.rewardMinor * runCount),
    );
    appState.activityCooldowns[cooldownKey] = nextReadyAtUnix;
  }
}

export function getLevelProgressRatio(company: CompanyState, config: EconomyConfig): number {
  const industry = getIndustry(config, company.industryId);
  if (!industry) {
    return 0;
  }
  const threshold = getAutoLevelThresholdMinor(company, industry.baseRevenuePerHourMinor);
  if (threshold <= 0) {
    return 0;
  }
  return Math.min(1, company.lifetimeProfitMinor / threshold);
}
