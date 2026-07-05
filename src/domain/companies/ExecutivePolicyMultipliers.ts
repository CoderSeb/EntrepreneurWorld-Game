import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';
import { isExecutiveHired } from '@/domain/companies/ExecutiveContracts';

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

export function hasActiveTaskAutomation(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
): boolean {
  return config.managers.some(
    (role) =>
      role.automatesTasks
      && role.appliesTo === company.companyKind
      && isExecutiveHired(company, role.id, nowUnix),
  );
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
