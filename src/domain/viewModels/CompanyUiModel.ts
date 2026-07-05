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
import { getActivityUnavailableRemaining } from '@/domain/companies/CompanyService';
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
  employeePayrollPerHourMinor,
  employeeRevenuePerHourMinor,
  marginalEmployeeProfitMinor,
  maxEmployeesForLevel,
  payrollLevelRevenueBonusPercent,
  MAX_PAYROLL_LEVEL,
} from '@/domain/companies/EmployeeService';
import { calculateActivityInstantCashMinor } from '@/domain/companies/ActivityRewardService';
import { getLevelProgressRatio } from '@/domain/companies/CompanyProgressionService';
import { describeIndustryBottleneck } from '@/domain/companies/IndustryMechanicsService';
import {
  getCompanyLifecyclePhase,
  CompanyLifecyclePhase,
} from '@/domain/companies/CompanyLifecycleService';
import { describeActivityEffect, describeActiveEffectLine } from '@/domain/companies/ActivityEffectService';
import {
  EXECUTIVE_AUTOMATION_POLICIES,
  ExecutiveAutomationPolicy,
  hasTaskAutomationActive,
} from '@/domain/companies/ExecutivePolicyService';
import {
  buildCompanyEconomyBreakdown,
  EconomyBreakdownLineUi,
} from '@/domain/economy/EconomyBreakdownService';
import { presentRealisticEconomyBreakdown } from '@/domain/economy/EconomyBreakdownPresenter';
import { getEconomyBreakdownLabel, getRealisticEconomyBreakdownLabel } from '@/i18n/economyLabels';
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
  cashBalanceMinor: number;
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
  payrollLevelRevenueBonusPercent: number;
  workforceRevenuePerHourMinor: number;
  workforcePayrollPerHourMinor: number;
  workforceNetPerHourMinor: number;
  nextPayrollLevelRevenueDeltaMinor: number | null;
  nextPayrollLevelPayrollDeltaMinor: number | null;
  marginalEmployeeProfitMinor: number;
  economyBreakdown: EconomyBreakdownLineUi[];
  economyRevenueBreakdown: EconomyBreakdownLineUi[];
  economyExpenseBreakdown: EconomyBreakdownLineUi[];
  economyGrossRevenueMinorPerHour: number;
  economyTotalExpensesMinorPerHour: number;
  economyNetMinorPerHour: number;
  bottleneckHint: string | null;
  lifecyclePhase: CompanyLifecyclePhase;
  automationPolicy: ExecutiveAutomationPolicy;
  activeEffectSummaries: string[];
  integrationDebtMinor: number;
  integrationComplete: boolean;
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
  return hasTaskAutomationActive(company, config, nowUnix);
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
    if (getActivityUnavailableRemaining(appState, company, activity.id, nowUnix) === 0) {
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
  const economyBreakdown = buildCompanyEconomyBreakdown(
    company,
    config,
    appState.marketState,
    subsidiaries,
    nowUnix,
  );

  const labeledBreakdown = economyBreakdown.lines.map((line) => ({
    ...line,
    label: translations ? getEconomyBreakdownLabel(line.id, translations) : line.id,
  }));

  const presentedBreakdown = presentRealisticEconomyBreakdown(
    economyBreakdown,
    (categoryId) =>
      translations ? getRealisticEconomyBreakdownLabel(categoryId, translations) : categoryId,
  );

  return {
    id: company.id,
    name: company.name,
    cashBalanceMinor: company.cashBalance.amountMinorUnits,
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
    payrollLevelRevenueBonusPercent: payrollLevelRevenueBonusPercent(company.payrollLevel),
    workforceRevenuePerHourMinor: employeeRevenuePerHourMinor(
      company.employeeCount,
      company.payrollLevel,
      company.level,
    ),
    workforcePayrollPerHourMinor: employeePayrollPerHourMinor(
      company.employeeCount,
      company.payrollLevel,
    ),
    workforceNetPerHourMinor:
      employeeRevenuePerHourMinor(company.employeeCount, company.payrollLevel, company.level)
      - employeePayrollPerHourMinor(company.employeeCount, company.payrollLevel),
    nextPayrollLevelRevenueDeltaMinor:
      company.payrollLevel < MAX_PAYROLL_LEVEL
        ? employeeRevenuePerHourMinor(company.employeeCount, company.payrollLevel + 1, company.level)
          - employeeRevenuePerHourMinor(company.employeeCount, company.payrollLevel, company.level)
        : null,
    nextPayrollLevelPayrollDeltaMinor:
      company.payrollLevel < MAX_PAYROLL_LEVEL
        ? employeePayrollPerHourMinor(company.employeeCount, company.payrollLevel + 1)
          - employeePayrollPerHourMinor(company.employeeCount, company.payrollLevel)
        : null,
    marginalEmployeeProfitMinor: marginalEmployeeProfitMinor(
      company.employeeCount,
      company.payrollLevel,
      company.level,
    ),
    economyBreakdown: labeledBreakdown,
    economyRevenueBreakdown: presentedBreakdown.revenueLines,
    economyExpenseBreakdown: presentedBreakdown.expenseLines,
    economyGrossRevenueMinorPerHour: presentedBreakdown.grossRevenueMinorPerHour,
    economyTotalExpensesMinorPerHour: presentedBreakdown.totalExpensesMinorPerHour,
    economyNetMinorPerHour: presentedBreakdown.netMinorPerHour,
    bottleneckHint: describeIndustryBottleneck(company, config),
    lifecyclePhase: getCompanyLifecyclePhase(company),
    automationPolicy: company.automationPolicy,
    activeEffectSummaries: buildActiveEffectSummaries(company, config, nowUnix, translations),
    integrationDebtMinor: company.integrationDebtMinor,
    integrationComplete: company.integrationComplete,
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
  instantCashPreviewMinor: number;
  effectDescription: string | null;
  cooldownRemaining: number;
  ready: boolean;
};

function buildActiveEffectSummaries(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
  translations?: TranslationDictionary,
): string[] {
  const activities = getActivitiesForKind(config, company.companyKind);
  return company.activeEffects
    .filter((effect) => effect.expiresAtUnix > nowUnix)
    .map((effect) => {
      const activity = activities.find((entry) => entry.id === effect.activityId);
      if (!activity) {
        return effect.activityId;
      }
      const label = translations ? getActivityLabel(activity.id, translations) : activity.displayName;
      const description = describeActiveEffectLine(effect);
      return `${label}: ${description}`;
    });
}

export { EXECUTIVE_AUTOMATION_POLICIES };
export type { ExecutiveAutomationPolicy };

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
      const cooldownRemaining = getActivityUnavailableRemaining(
        appState,
        company,
        activity.id,
        nowUnix,
      );
      const instantCashPreviewMinor = calculateActivityInstantCashMinor(
        activity,
        company,
        config,
        appState.marketState,
        appState.companies,
        nowUnix,
      );
      tasks.push({
        id: `${company.id}:${activity.id}`,
        companyId: company.id,
        companyName: company.name,
        activityId: activity.id,
        label: translations ? getActivityLabel(activity.id, translations) : activity.displayName,
        rewardMinor: activity.rewardMinor,
        instantCashPreviewMinor,
        effectDescription: describeActivityEffect(activity),
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
