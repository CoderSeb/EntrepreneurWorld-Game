import { colors } from '@/theme/tokens';
import {
  EconomyConfig,
  getActivitiesForKind,
  getAutomationLevel,
  getIndustry,
} from '@/domain/config/EconomyConfig';
import { resolveIndustryPresentation } from '@/domain/config/IndustryPresentation';
import { AppState, findCompany } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { getActivityCooldownRemaining } from '@/domain/companies/CompanyService';
import {
  getExpensesPerHour,
  getRevenuePerHour,
} from '@/domain/economy/EffectiveEconomyCalculator';
import { buildExecutiveRoleUiModels, countHiredExecutives } from '@/domain/companies/ExecutiveRoles';
import { getLevelProgressRatio } from '@/domain/companies/CompanyProgressionService';

const LEGACY_INDUSTRY_COLORS: Record<string, string> = {
  cafe: colors.warning,
  cleaning: colors.success,
  auto_repair: colors.danger,
  ecommerce: colors.accentPurple,
  software: colors.primary,
  real_estate: '#f59e0b',
};

export type CompanyUiModel = {
  id: string;
  name: string;
  industryId: string;
  industryLabel: string;
  sectorColor: string;
  level: number;
  revenueMinor: number;
  expensesMinor: number;
  profitMinor: number;
  health: number;
  growth: number;
  pendingTasks: number;
  hiredExecutiveCount: number;
  levelProgress: number;
  automationLevel: number;
  maxAutomationLevel: number;
  nextAutomationCostMinor: number | null;
};

export function industryColor(industryId: string, config?: EconomyConfig): string {
  if (config) {
    const industry = getIndustry(config, industryId);
    if (industry) {
      return resolveIndustryPresentation(industry).accentColor;
    }
  }
  return LEGACY_INDUSTRY_COLORS[industryId] ?? colors.primary;
}

export function buildCompanyUiModel(
  company: CompanyState,
  config: EconomyConfig,
  appState: AppState,
  nowUnix: number,
): CompanyUiModel {
  const industry = getIndustry(config, company.industryId);
  const revenue = getRevenuePerHour(company, config, appState.marketState);
  const expenses = getExpensesPerHour(company, config, appState.marketState);
  const profit = revenue.subtract(expenses);
  const revenueMinor = revenue.amountMinorUnits;
  const expensesMinor = expenses.amountMinorUnits;
  const profitMinor = profit.amountMinorUnits;

  const margin =
    revenueMinor > 0 ? (profitMinor / revenueMinor) * 100 : 0;
  const health = Math.max(
    5,
    Math.min(100, Math.round(50 + margin - company.riskLevel * 20 + company.level * 2)),
  );
  const growth = Math.max(-99, Math.min(99, margin + company.level * 1.5 - company.riskLevel * 5));

  const activities = getActivitiesForKind(config, company.companyKind);
  let pendingTasks = 0;
  for (const activity of activities) {
    if (getActivityCooldownRemaining(appState, company.id, activity.id, nowUnix) === 0) {
      pendingTasks += 1;
    }
  }

  return {
    id: company.id,
    name: company.name,
    industryId: company.industryId,
    industryLabel: industry?.displayName ?? company.industryId.toUpperCase(),
    sectorColor: industryColor(company.industryId, config),
    level: company.level,
    revenueMinor,
    expensesMinor,
    profitMinor,
    health,
    growth,
    pendingTasks,
    hiredExecutiveCount: countHiredExecutives(company),
    levelProgress: getLevelProgressRatio(company, config),
    automationLevel: company.automationLevel,
    maxAutomationLevel: config.automationLevels.reduce((max, level) => Math.max(max, level.level), 0),
    nextAutomationCostMinor: getAutomationLevel(config, company.automationLevel + 1)?.upgradeCostMinor ?? null,
  };
}

export function buildCompanyExecutiveRoles(
  appState: AppState,
  config: EconomyConfig,
  companyId: string,
) {
  const company = findCompany(appState, companyId);
  if (!company) {
    return [];
  }
  return buildExecutiveRoleUiModels(company, config);
}

export function buildCompanyUiModels(
  appState: AppState,
  config: EconomyConfig,
  nowUnix: number,
): CompanyUiModel[] {
  return appState.companies
    .filter((c) => c.companyKind === 'subsidiary')
    .map((company) => buildCompanyUiModel(company, config, appState, nowUnix));
}

export type TaskUiModel = {
  id: string;
  companyId: string;
  companyName: string;
  activityId: string;
  label: string;
  rewardMinor: number;
  cooldownRemaining: number;
  ready: boolean;
};

export function buildTaskUiModels(
  appState: AppState,
  config: EconomyConfig,
  nowUnix: number,
): TaskUiModel[] {
  const tasks: TaskUiModel[] = [];
  for (const company of appState.companies) {
    if (company.companyKind !== 'subsidiary') {
      continue;
    }
    for (const activity of getActivitiesForKind(config, company.companyKind)) {
      const cooldownRemaining = getActivityCooldownRemaining(
        appState,
        company.id,
        activity.id,
        nowUnix,
      );
      tasks.push({
        id: `${company.id}:${activity.id}`,
        companyId: company.id,
        companyName: company.name,
        activityId: activity.id,
        label: activity.displayName,
        rewardMinor: activity.rewardMinor,
        cooldownRemaining,
        ready: cooldownRemaining === 0,
      });
    }
  }
  return tasks;
}
