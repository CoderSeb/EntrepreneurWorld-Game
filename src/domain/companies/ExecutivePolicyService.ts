import { ActivityDefinition, EconomyConfig } from '@/domain/config/EconomyConfig';
import { MarketState } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { employeePayrollPerHourMinor } from '@/domain/companies/EmployeeService';
import {
  ExecutiveAutomationPolicy,
  EXECUTIVE_AUTOMATION_POLICIES,
  hasActiveTaskAutomation,
  normalizeAutomationPolicy,
} from '@/domain/companies/ExecutivePolicyMultipliers';

export type { ExecutiveAutomationPolicy };
export {
  EXECUTIVE_AUTOMATION_POLICIES,
  getPolicyExpenseMultiplier,
  getPolicyRevenueMultiplier,
  hasActiveTaskAutomation,
  normalizeAutomationPolicy,
} from '@/domain/companies/ExecutivePolicyMultipliers';

const CASH_RESERVE_RUNWAY_HOURS = 24;

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
  return hasActiveTaskAutomation(company, config, atUnix);
}

export function estimateCashReserveThresholdMinor(
  company: CompanyState,
  config: EconomyConfig,
): number {
  const payrollPerHour = employeePayrollPerHourMinor(company.employeeCount, company.payrollLevel);
  const conservativeHourlyBurn = company.expensesPerHour.amountMinorUnits + payrollPerHour;
  return Math.max(
    config.lowCashThresholdMinor,
    conservativeHourlyBurn * CASH_RESERVE_RUNWAY_HOURS,
  );
}

export function shouldAutomateActivity(
  company: CompanyState,
  activity: ActivityDefinition,
  config: EconomyConfig,
  _marketState: MarketState,
  nowUnix: number,
): boolean {
  const policy = normalizeAutomationPolicy(company.automationPolicy);
  if (!hasActiveTaskAutomation(company, config, nowUnix)) {
    return false;
  }

  if (policy === 'cash_reserve') {
    const minimumCash = estimateCashReserveThresholdMinor(company, config);
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
