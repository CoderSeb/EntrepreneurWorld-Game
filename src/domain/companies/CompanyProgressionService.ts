import { EconomyConfig, getActivitiesForKind, getIndustry } from '@/domain/config/EconomyConfig';
import { AppState } from '@/domain/core/AppState';
import { CompanyState, isHolding } from '@/domain/core/CompanyState';
import { applyLevelUpgrade } from '@/domain/economy/UpgradeCalculator';
import { getExpensesPerHour, getRevenuePerHour } from '@/domain/economy/EffectiveEconomyCalculator';
import { expireExecutiveContracts } from '@/domain/companies/ExecutiveContracts';
import { applyRankIfImproved } from '@/domain/progression/ProgressionService';
import { applyActivityEffect } from '@/domain/companies/ActivityEffectService';
import { accrueIntegrationDebtInterest } from '@/domain/companies/AcquisitionService';
import {
  getCompanyLifecyclePhase,
  getLifecycleLevelThresholdMultiplier,
  getLifecycleOrganicProfitMultiplier,
} from '@/domain/companies/CompanyLifecycleService';
import {
  hasTaskAutomationActive,
  shouldAutomateActivity,
} from '@/domain/companies/ExecutivePolicyService';

export function getAutoLevelThresholdMinor(company: CompanyState, baseRevenuePerHourMinor: number): number {
  const phase = getCompanyLifecyclePhase(company);
  const lifecycleMultiplier = getLifecycleLevelThresholdMultiplier(phase);
  return Math.max(25_000, baseRevenuePerHourMinor * company.level * 8 * lifecycleMultiplier);
}

export { hasTaskAutomationActive };

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

export function buildAutomationPeriodSegments(
  company: CompanyState,
  config: EconomyConfig,
  periodStartUnix: number,
  periodEndUnix: number,
): Array<{ startUnix: number; endUnix: number }> {
  if (periodEndUnix <= periodStartUnix) {
    return [];
  }

  const boundaries = new Set<number>([periodStartUnix, periodEndUnix]);
  for (const role of config.managers) {
    if (!role.automatesTasks || role.appliesTo !== company.companyKind) {
      continue;
    }

    const contract = company.executiveContracts[role.id];
    if (!contract) {
      continue;
    }

    const expiry = contract.expiresAtUnix;
    if (expiry > periodStartUnix && expiry < periodEndUnix) {
      boundaries.add(expiry);
    }
  }

  const sorted = [...boundaries].sort((left, right) => left - right);
  const segments: Array<{ startUnix: number; endUnix: number }> = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    segments.push({ startUnix: sorted[index], endUnix: sorted[index + 1] });
  }

  return segments;
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
      expireExecutiveContracts(company, nowUnix);
      continue;
    }

    const revenue = getRevenuePerHour(company, config, appState.marketState, subsidiaries, nowUnix);
    const expenses = getExpensesPerHour(company, config, appState.marketState, nowUnix);
    const lifecycleMultiplier = getLifecycleOrganicProfitMultiplier(getCompanyLifecyclePhase(company));
    const profitMinor = Math.max(
      0,
      revenue.subtract(expenses).amountMinorUnits * hours * lifecycleMultiplier,
    );
    company.lifetimeProfitMinor += Math.round(profitMinor);
    accrueIntegrationDebtInterest(company, deltaSeconds);

    while (company.lifetimeProfitMinor >= getAutoLevelThresholdMinor(company, industry.baseRevenuePerHourMinor)) {
      company.lifetimeProfitMinor -= getAutoLevelThresholdMinor(company, industry.baseRevenuePerHourMinor);
      const upgraded = applyLevelUpgrade(company, industry, nowUnix);
      Object.assign(company, upgraded);
    }

    runAutomatedExecutiveTasks(appState, config, company, periodStartUnix, nowUnix);
    expireExecutiveContracts(company, nowUnix);
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
  const segments = buildAutomationPeriodSegments(company, config, periodStartUnix, periodEndUnix);
  if (segments.length === 0) {
    return;
  }

  for (const activity of getActivitiesForKind(config, company.companyKind)) {
    const cooldownKey = `${company.id}:${activity.id}`;
    let readyAt = appState.activityCooldowns[cooldownKey] ?? 0;

    for (const segment of segments) {
      if (!hasTaskAutomationActive(company, config, segment.startUnix)) {
        continue;
      }
      if (!shouldAutomateActivity(company, activity, config, appState.marketState, segment.startUnix)) {
        continue;
      }

      const { runCount, nextReadyAtUnix } = countAutomatedActivityRuns(
        readyAt,
        segment.startUnix,
        segment.endUnix,
        activity.cooldownSeconds,
      );

      if (runCount <= 0) {
        continue;
      }

      for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
        applyActivityEffect(company, activity, segment.endUnix);
      }
      readyAt = nextReadyAtUnix;
    }

    if (readyAt !== (appState.activityCooldowns[cooldownKey] ?? 0)) {
      appState.activityCooldowns[cooldownKey] = readyAt;
    }
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
