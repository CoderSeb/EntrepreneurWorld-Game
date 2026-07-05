import { colors } from '@/theme/tokens';
import {
  EconomyConfig,
  getActivitiesForKind,
  getIndustry,
  getUpgradeTrack,
} from '@/domain/config/EconomyConfig';
import { resolveIndustryPresentation } from '@/domain/config/IndustryPresentation';
import { AppState, findCompany } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { getActivityCooldownRemaining } from '@/domain/companies/CompanyService';
import {
  getExpensesPerHour,
  getRevenuePerHour,
} from '@/domain/economy/EffectiveEconomyCalculator';
import {
  buildExecutiveRoleUiModels,
  countHiredExecutives,
  isExecutiveHired,
} from '@/domain/companies/ExecutiveRoles';
import {
  marginalEmployeeProfitMinor,
  maxEmployeesForLevel,
} from '@/domain/companies/EmployeeService';
import { getLevelProgressRatio } from '@/domain/companies/CompanyProgressionService';
import {
  getMaxSystemsLevel,
  getNextSystemsUpgradeCostMinor,
} from '@/domain/companies/SystemsService';
import { getTrackLevel, getUpgradeCost } from '@/domain/companies/UpgradeTrackService';
import { getActivityLabel, getTrackLabel } from '@/i18n/configLabels';
import { getIndustryLabel } from '@/i18n/industryLabels';
import type { TranslationDictionary } from '@/i18n/types';

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
  hasTaskAutomation: boolean;
  levelProgress: number;
  automationLevel: number;
  maxAutomationLevel: number;
  nextAutomationCostMinor: number | null;
  preferredTrackId: string | null;
  preferredTrackName: string | null;
  preferredTrackLevel: number;
  preferredTrackMaxLevel: number;
  nextPreferredTrackCostMinor: number | null;
  preferredTrackRevenueBonusPercent: number;
  employeeCount: number;
  maxEmployees: number;
  payrollLevel: number;
  marginalEmployeeProfitMinor: number;
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

function companyHasTaskAutomation(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
): boolean {
  return config.managers.some(
    (role) => role.automatesTasks && isExecutiveHired(company, role.id, nowUnix),
  );
}

export function buildCompanyUiModel(
  company: CompanyState,
  config: EconomyConfig,
  appState: AppState,
  nowUnix: number,
  translations?: TranslationDictionary,
): CompanyUiModel {
  const industry = getIndustry(config, company.industryId);
  const subsidiaries = appState.companies.filter((entry) => entry.companyKind === 'subsidiary');
  const revenue = getRevenuePerHour(company, config, appState.marketState, subsidiaries, nowUnix);
  const expenses = getExpensesPerHour(company, config, appState.marketState, nowUnix);
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

  const preferredTrackId = industry?.preferredTrackId ?? null;
  const preferredTrack = preferredTrackId ? getUpgradeTrack(config, preferredTrackId) : null;
  const preferredTrackLevel = preferredTrackId ? getTrackLevel(company, preferredTrackId) : 0;
  const preferredTrackMaxLevel = preferredTrack?.maxLevel ?? 0;
  const nextPreferredTrackCostMinor =
    preferredTrack && preferredTrackLevel < preferredTrack.maxLevel
      ? getUpgradeCost(company, preferredTrack).amountMinorUnits
      : null;

  return {
    id: company.id,
    name: company.name,
    industryId: company.industryId,
    industryLabel: translations
      ? getIndustryLabel(company.industryId, translations)
      : industry?.displayName ?? company.industryId.toUpperCase(),
    sectorColor: industryColor(company.industryId, config),
    level: company.level,
    revenueMinor,
    expensesMinor,
    profitMinor,
    health,
    growth,
    pendingTasks,
    hiredExecutiveCount: countHiredExecutives(company, config, nowUnix),
    hasTaskAutomation: companyHasTaskAutomation(company, config, nowUnix),
    levelProgress: getLevelProgressRatio(company, config),
    automationLevel: company.automationLevel,
    maxAutomationLevel: industry ? getMaxSystemsLevel(industry, config) : 0,
    nextAutomationCostMinor:
      industry ? getNextSystemsUpgradeCostMinor(company, industry, config) : null,
    preferredTrackId,
    preferredTrackName: preferredTrack
      ? translations
        ? getTrackLabel(preferredTrack.id, translations)
        : preferredTrack.displayName
      : null,
    preferredTrackLevel,
    preferredTrackMaxLevel,
    nextPreferredTrackCostMinor,
    preferredTrackRevenueBonusPercent: preferredTrack
      ? Math.round(preferredTrack.revenueBonusPerLevel * 100)
      : 0,
    employeeCount: company.employeeCount,
    maxEmployees: maxEmployeesForLevel(company.level),
    payrollLevel: company.payrollLevel,
    marginalEmployeeProfitMinor: marginalEmployeeProfitMinor(
      company.employeeCount,
      company.payrollLevel,
      company.level,
    ),
  };
}

export function buildCompanyExecutiveRoles(
  appState: AppState,
  config: EconomyConfig,
  companyId: string,
  nowUnix: number = Math.floor(Date.now() / 1000),
  translations?: TranslationDictionary,
) {
  const company = findCompany(appState, companyId);
  if (!company) {
    return [];
  }
  return buildExecutiveRoleUiModels(company, config, nowUnix, translations);
}

export function buildCompanyUiModels(
  appState: AppState,
  config: EconomyConfig,
  nowUnix: number,
  translations?: TranslationDictionary,
): CompanyUiModel[] {
  return appState.companies
    .filter((c) => c.companyKind === 'subsidiary')
    .map((company) => buildCompanyUiModel(company, config, appState, nowUnix, translations));
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
  translations?: TranslationDictionary,
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
        label: translations ? getActivityLabel(activity.id, translations) : activity.displayName,
        rewardMinor: activity.rewardMinor,
        cooldownRemaining,
        ready: cooldownRemaining === 0,
      });
    }
  }
  return tasks;
}

export function previewRevenuePerHourMinor(
  company: CompanyState,
  config: EconomyConfig,
  appState: AppState,
  overrides: {
    automationLevel?: number;
    trackLevelDelta?: { trackId: string; delta: number };
    employeeCount?: number;
    payrollLevel?: number;
  },
  nowUnix: number = Math.floor(Date.now() / 1000),
): number {
  const draft: CompanyState = {
    ...company,
    upgradeTrackLevels: { ...company.upgradeTrackLevels },
    executiveContracts: { ...company.executiveContracts },
  };

  if (overrides.automationLevel !== undefined) {
    draft.automationLevel = overrides.automationLevel;
  }

  if (overrides.trackLevelDelta) {
    const { trackId, delta } = overrides.trackLevelDelta;
    const current = draft.upgradeTrackLevels[trackId] ?? 0;
    draft.upgradeTrackLevels[trackId] = current + delta;
  }

  if (overrides.employeeCount !== undefined) {
    draft.employeeCount = overrides.employeeCount;
  }

  if (overrides.payrollLevel !== undefined) {
    draft.payrollLevel = overrides.payrollLevel;
  }

  const subsidiaries = appState.companies.filter((entry) => entry.companyKind === 'subsidiary');
  return getRevenuePerHour(draft, config, appState.marketState, subsidiaries, nowUnix).amountMinorUnits;
}
