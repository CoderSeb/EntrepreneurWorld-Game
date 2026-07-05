import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { MarketState } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import {
  getActivityExpenseMultiplier,
  getActivityRevenueMultiplier,
} from '@/domain/companies/ActivityEffectService';
import {
  employeePayrollPerHourMinor,
  employeeRevenuePerHourMinor,
} from '@/domain/companies/EmployeeService';
import {
  getIndustryCapacityCapMinor,
  getIndustryInventoryCapMinor,
  getIndustryLeverageInterestPerHourMinor,
  getIndustryLeverageRevenueMultiplier,
  getIndustryRetentionMultiplier,
  getIndustryVacancyMultiplier,
} from '@/domain/companies/IndustryMechanicsService';
import {
  getPolicyExpenseMultiplier,
  getPolicyRevenueMultiplier,
} from '@/domain/companies/ExecutivePolicyMultipliers';
import { getIntegrationDebtExpensePerHourMinor } from '@/domain/companies/AcquisitionService';
import { getExecutiveSalaryMinor, isExecutiveHired } from '@/domain/companies/ExecutiveContracts';
import { getTrackLevel } from '@/domain/companies/UpgradeTrackService';
import {
  getExpenseMultiplier as getTrackExpenseMultiplier,
  getRevenueMultiplier as getTrackRevenueMultiplier,
} from '@/domain/companies/UpgradeTrackService';
import { getIndustry, getManager } from '@/domain/config/EconomyConfig';
import {
  getExpenseMultiplier,
  getRevenueMultiplier,
} from '@/domain/economy/MarketModifierCalculator';
import {
  getPortfolioRevenueMultiplier,
  getRevenuePerHour,
  getExpensesPerHour,
  PREFERRED_TRACK_REVENUE_BONUS,
} from '@/domain/economy/EffectiveEconomyCalculator';
import { MoneyValue } from '@/domain/money/MoneyValue';

export type EconomyBreakdownLine = {
  id: string;
  amountMinorPerHour: number;
  kind: 'revenue' | 'expense';
};

export type EconomyBreakdownLineUi = EconomyBreakdownLine & {
  label: string;
  /** Expense credits (e.g. management savings) reduce the expense total but show in the expense section. */
  isCredit?: boolean;
};

export type CompanyEconomyBreakdown = {
  lines: EconomyBreakdownLine[];
  grossRevenueMinorPerHour: number;
  totalExpensesMinorPerHour: number;
  netMinorPerHour: number;
};

export function buildCompanyEconomyBreakdown(
  company: CompanyState,
  config: EconomyConfig,
  marketState: MarketState,
  subsidiaries: CompanyState[],
  nowUnix: number,
): CompanyEconomyBreakdown {
  const lines: EconomyBreakdownLine[] = [];
  const industry = getIndustry(config, company.industryId);

  let revenueMinor = company.revenuePerHour.amountMinorUnits;
  lines.push({ id: 'base_revenue', amountMinorPerHour: revenueMinor, kind: 'revenue' });

  const employeeRevenue = employeeRevenuePerHourMinor(
    company.employeeCount,
    company.payrollLevel,
    company.level,
  );
  if (employeeRevenue !== 0) {
    lines.push({ id: 'employee_revenue', amountMinorPerHour: employeeRevenue, kind: 'revenue' });
    revenueMinor += employeeRevenue;
  }

  const automation = config.automationLevels.find((entry) => entry.level === company.automationLevel);
  if (automation && automation.revenueMultiplier !== 1) {
    const delta = Math.round(revenueMinor * (automation.revenueMultiplier - 1));
    lines.push({ id: 'automation_revenue', amountMinorPerHour: delta, kind: 'revenue' });
    revenueMinor = Math.round(revenueMinor * automation.revenueMultiplier);
  }

  for (const role of config.managers) {
    if (!isExecutiveHired(company, role.id, nowUnix) || role.revenueMultiplier === 1) {
      continue;
    }
    const delta = Math.round(revenueMinor * (role.revenueMultiplier - 1));
    lines.push({ id: `executive_revenue_${role.id}`, amountMinorPerHour: delta, kind: 'revenue' });
    revenueMinor = Math.round(revenueMinor * role.revenueMultiplier);
  }

  if (industry?.preferredTrackId && getTrackLevel(company, industry.preferredTrackId) >= 1) {
    const delta = Math.round(revenueMinor * (PREFERRED_TRACK_REVENUE_BONUS - 1));
    lines.push({ id: 'preferred_track_revenue', amountMinorPerHour: delta, kind: 'revenue' });
    revenueMinor = Math.round(revenueMinor * PREFERRED_TRACK_REVENUE_BONUS);
  }

  const trackRevenueMultiplier = getTrackRevenueMultiplier(company, config);
  if (trackRevenueMultiplier !== 1) {
    const delta = Math.round(revenueMinor * (trackRevenueMultiplier - 1));
    lines.push({ id: 'upgrade_tracks_revenue', amountMinorPerHour: delta, kind: 'revenue' });
    revenueMinor = Math.round(revenueMinor * trackRevenueMultiplier);
  }

  const portfolioMultiplier = getPortfolioRevenueMultiplier(company, subsidiaries);
  if (portfolioMultiplier !== 1) {
    const delta = Math.round(revenueMinor * (portfolioMultiplier - 1));
    lines.push({ id: 'portfolio_revenue', amountMinorPerHour: delta, kind: 'revenue' });
    revenueMinor = Math.round(revenueMinor * portfolioMultiplier);
  }

  const marketRevenueMultiplier = getRevenueMultiplier(marketState, company.industryId);
  if (marketRevenueMultiplier !== 1) {
    const delta = Math.round(revenueMinor * (marketRevenueMultiplier - 1));
    lines.push({ id: 'market_revenue', amountMinorPerHour: delta, kind: 'revenue' });
    revenueMinor = Math.round(revenueMinor * marketRevenueMultiplier);
  }

  const activityRevenueMultiplier = getActivityRevenueMultiplier(company, nowUnix);
  if (activityRevenueMultiplier !== 1) {
    const delta = Math.round(revenueMinor * (activityRevenueMultiplier - 1));
    lines.push({ id: 'activity_revenue', amountMinorPerHour: delta, kind: 'revenue' });
    revenueMinor = Math.round(revenueMinor * activityRevenueMultiplier);
  }

  const policyRevenueMultiplier = getPolicyRevenueMultiplier(company, config, nowUnix);
  if (policyRevenueMultiplier !== 1) {
    const delta = Math.round(revenueMinor * (policyRevenueMultiplier - 1));
    lines.push({ id: 'policy_revenue', amountMinorPerHour: delta, kind: 'revenue' });
    revenueMinor = Math.round(revenueMinor * policyRevenueMultiplier);
  }

  if (industry?.mechanics?.primaryBottleneck === 'retention') {
    const retention = getIndustryRetentionMultiplier(company, industry);
    if (retention !== 1) {
      const delta = Math.round(revenueMinor * (retention - 1));
      lines.push({ id: 'retention_revenue', amountMinorPerHour: delta, kind: 'revenue' });
      revenueMinor = Math.round(revenueMinor * retention);
    }
  }

  if (industry?.mechanics?.primaryBottleneck === 'leverage') {
    const vacancy = getIndustryVacancyMultiplier(company, industry);
    if (vacancy !== 1) {
      const delta = Math.round(revenueMinor * (vacancy - 1));
      lines.push({ id: 'vacancy_revenue', amountMinorPerHour: delta, kind: 'revenue' });
      revenueMinor = Math.round(revenueMinor * vacancy);
    }
    const leverage = getIndustryLeverageRevenueMultiplier(company, industry);
    if (leverage !== 1) {
      const delta = Math.round(revenueMinor * (leverage - 1));
      lines.push({ id: 'leverage_revenue', amountMinorPerHour: delta, kind: 'revenue' });
      revenueMinor = Math.round(revenueMinor * leverage);
    }
  }

  if (industry) {
    let cappedRevenueMinor = revenueMinor;
    const capacityCap = getIndustryCapacityCapMinor(company, industry);
    if (capacityCap != null && cappedRevenueMinor > capacityCap) {
      lines.push({
        id: 'capacity_cap_revenue',
        amountMinorPerHour: capacityCap - cappedRevenueMinor,
        kind: 'revenue',
      });
      cappedRevenueMinor = capacityCap;
    }

    const inventoryCap = getIndustryInventoryCapMinor(company, industry);
    if (inventoryCap != null && cappedRevenueMinor > inventoryCap) {
      lines.push({
        id: 'inventory_cap_revenue',
        amountMinorPerHour: inventoryCap - cappedRevenueMinor,
        kind: 'revenue',
      });
      cappedRevenueMinor = inventoryCap;
    }

    revenueMinor = cappedRevenueMinor;
  }

  let expenseMinor = company.expensesPerHour.amountMinorUnits;
  lines.push({ id: 'base_expenses', amountMinorPerHour: expenseMinor, kind: 'expense' });

  const payroll = employeePayrollPerHourMinor(company.employeeCount, company.payrollLevel);
  if (payroll !== 0) {
    lines.push({ id: 'employee_payroll', amountMinorPerHour: payroll, kind: 'expense' });
    expenseMinor += payroll;
  }

  if (automation && automation.expenseMultiplier !== 1) {
    const delta = Math.round(expenseMinor * (automation.expenseMultiplier - 1));
    lines.push({ id: 'automation_expenses', amountMinorPerHour: delta, kind: 'expense' });
    expenseMinor = Math.round(expenseMinor * automation.expenseMultiplier);
  }

  for (const role of config.managers) {
    if (!isExecutiveHired(company, role.id, nowUnix)) {
      continue;
    }
    const definition = getManager(config, role.id);
    if (!definition) {
      continue;
    }
    const salary = getExecutiveSalaryMinor(company, definition);
    lines.push({ id: `executive_salary_${role.id}`, amountMinorPerHour: salary, kind: 'expense' });
    expenseMinor += salary;
    if (role.expenseMultiplier !== 1) {
      const delta = Math.round((expenseMinor - salary) * (role.expenseMultiplier - 1));
      lines.push({ id: `executive_expense_${role.id}`, amountMinorPerHour: delta, kind: 'expense' });
      expenseMinor = Math.round((expenseMinor - salary) * role.expenseMultiplier + salary);
    }
  }

  const trackExpenseMultiplier = getTrackExpenseMultiplier(company, config);
  if (trackExpenseMultiplier !== 1) {
    const delta = Math.round(expenseMinor * (trackExpenseMultiplier - 1));
    lines.push({ id: 'upgrade_tracks_expenses', amountMinorPerHour: delta, kind: 'expense' });
    expenseMinor = Math.round(expenseMinor * trackExpenseMultiplier);
  }

  const marketExpenseMultiplier = getExpenseMultiplier(marketState, company.industryId);
  if (marketExpenseMultiplier !== 1) {
    const delta = Math.round(expenseMinor * (marketExpenseMultiplier - 1));
    lines.push({ id: 'market_expenses', amountMinorPerHour: delta, kind: 'expense' });
    expenseMinor = Math.round(expenseMinor * marketExpenseMultiplier);
  }

  const activityExpenseMultiplier = getActivityExpenseMultiplier(company, nowUnix);
  if (activityExpenseMultiplier !== 1) {
    const delta = Math.round(expenseMinor * (activityExpenseMultiplier - 1));
    lines.push({ id: 'activity_expenses', amountMinorPerHour: delta, kind: 'expense' });
    expenseMinor = Math.round(expenseMinor * activityExpenseMultiplier);
  }

  const policyExpenseMultiplier = getPolicyExpenseMultiplier(company, config, nowUnix);
  if (policyExpenseMultiplier !== 1) {
    const delta = Math.round(expenseMinor * (policyExpenseMultiplier - 1));
    lines.push({ id: 'policy_expenses', amountMinorPerHour: delta, kind: 'expense' });
    expenseMinor = Math.round(expenseMinor * policyExpenseMultiplier);
  }

  if (industry) {
    const leverageInterest = getIndustryLeverageInterestPerHourMinor(company, industry);
    if (leverageInterest > 0) {
      lines.push({ id: 'leverage_interest', amountMinorPerHour: leverageInterest, kind: 'expense' });
      expenseMinor += leverageInterest;
    }
  }

  const integrationDebt = getIntegrationDebtExpensePerHourMinor(company);
  if (integrationDebt > 0) {
    lines.push({ id: 'integration_debt', amountMinorPerHour: integrationDebt, kind: 'expense' });
    expenseMinor += integrationDebt;
  }

  const grossFromLines = lines
    .filter((line) => line.kind === 'revenue')
    .reduce((sum, line) => sum + line.amountMinorPerHour, 0);
  const expensesFromLines = lines
    .filter((line) => line.kind === 'expense')
    .reduce((sum, line) => sum + line.amountMinorPerHour, 0);
  const lineNet = grossFromLines - expensesFromLines;

  const actualNet = getRevenuePerHour(company, config, marketState, subsidiaries, nowUnix)
    .subtract(getExpensesPerHour(company, config, marketState, nowUnix))
    .amountMinorUnits;

  return {
    lines,
    grossRevenueMinorPerHour: grossFromLines,
    totalExpensesMinorPerHour: expensesFromLines,
    netMinorPerHour: lineNet === actualNet ? lineNet : actualNet,
  };
}
