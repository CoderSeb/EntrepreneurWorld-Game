import { ActivityDefinition, EconomyConfig } from '@/domain/config/EconomyConfig';
import { MarketState } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { isExecutiveHired } from '@/domain/companies/ExecutiveContracts';
import { getExpensesPerHour } from '@/domain/economy/EffectiveEconomyCalculator';

export type ExecutiveAutomationPolicy =
  | 'balanced'
  | 'aggressive_growth'
  | 'cost_control'
  | 'quality_first'
  | 'cash_reserve';

export const EXECUTIVE_AUTOMATION_POLICIES: ExecutiveAutomationPolicy[] = [
  'balanced',
  'aggressive_growth',
  'cost_control',
  'quality_first',
  'cash_reserve',
];

const POLICY_REVENUE: Record<ExecutiveAutomationPolicy, number> = {
  balanced: 1,
  aggressive_growth: 1.03,
  cost_control: 0.98,
  quality_first: 0.99,
  cash_reserve: 1,
};

const POLICY_EXPENSE: Record<ExecutiveAutomationPolicy, number> = {
  balanced: 1,
  aggressive_growth: 1.02,
  cost_control: 0.96,
  quality_first: 1.01,
  cash_reserve: 0.97,
};

export function normalizeAutomationPolicy(value: string | undefined): ExecutiveAutomationPolicy {
  if (value && EXECUTIVE_AUTOMATION_POLICIES.includes(value as ExecutiveAutomationPolicy)) {
    return value as ExecutiveAutomationPolicy;
  }
  return 'balanced';
}

export function setCompanyAutomationPolicy(
  company: CompanyState,
  policy: ExecutiveAutomationPolicy,
  nowUnix: number,
): void {
  company.automationPolicy = policy;
  company.updatedAtUnix = nowUnix;
}

export function hasTaskAutomationActive(
  company: CompanyState,
  config: EconomyConfig,
  atUnix: number,
): boolean {
  return config.managers.some(
    (role) =>
      role.automatesTasks &&
      role.appliesTo === company.companyKind &&
      isExecutiveHired(company, role.id, atUnix),
  );
}

export function hasActiveTaskAutomation(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
): boolean {
  return hasTaskAutomationActive(company, config, nowUnix);
}

export function getPolicyRevenueMultiplier(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
): number {
  if (!hasActiveTaskAutomation(company, config, nowUnix)) {
    return 1;
  }
  return POLICY_REVENUE[normalizeAutomationPolicy(company.automationPolicy)];
}

export function getPolicyExpenseMultiplier(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
): number {
  if (!hasActiveTaskAutomation(company, config, nowUnix)) {
    return 1;
  }
  return POLICY_EXPENSE[normalizeAutomationPolicy(company.automationPolicy)];
}

export function shouldAutomateActivity(
  company: CompanyState,
  activity: ActivityDefinition,
  config: EconomyConfig,
  marketState: MarketState,
  nowUnix: number,
): boolean {
  const policy = normalizeAutomationPolicy(company.automationPolicy);
  if (!hasActiveTaskAutomation(company, config, nowUnix)) {
    return false;
  }

  if (policy === 'cash_reserve') {
    const runwayHours = 24;
    const hourlyBurn = getExpensesPerHour(company, config, marketState, nowUnix).amountMinorUnits;
    const minimumCash = Math.max(config.lowCashThresholdMinor, hourlyBurn * runwayHours);
    if (company.cashBalance.amountMinorUnits < minimumCash) {
      return false;
    }
  }

  if (policy === 'cost_control') {
    return (
      activity.effectType === 'temporary_expense_multiplier'
      || activity.id === 'serve_customers'
    );
  }

  if (policy === 'aggressive_growth') {
    return activity.effectType !== 'temporary_expense_multiplier' || activity.id === 'optimize_workflow';
  }

  if (policy === 'quality_first') {
    return activity.id !== 'launch_campaign';
  }

  return true;
}

export function filterActivitiesForAutomation(
  company: CompanyState,
  activities: ActivityDefinition[],
  config: EconomyConfig,
  marketState: MarketState,
  nowUnix: number,
): ActivityDefinition[] {
  const policy = normalizeAutomationPolicy(company.automationPolicy);
  const eligible = activities.filter((activity) =>
    shouldAutomateActivity(company, activity, config, marketState, nowUnix),
  );

  if (policy === 'aggressive_growth') {
    return [...eligible].sort((left, right) => {
      const leftScore = left.effectType === 'temporary_revenue_multiplier' ? 1 : 0;
      const rightScore = right.effectType === 'temporary_revenue_multiplier' ? 1 : 0;
      return rightScore - leftScore;
    });
  }

  if (policy === 'cost_control') {
    return [...eligible].sort((left, right) => {
      const leftScore = left.effectType === 'temporary_expense_multiplier' ? 1 : 0;
      const rightScore = right.effectType === 'temporary_expense_multiplier' ? 1 : 0;
      return rightScore - leftScore;
    });
  }

  return eligible;
}
