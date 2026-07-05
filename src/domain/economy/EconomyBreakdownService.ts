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
  applyIndustryRevenueConstraints,
  getIndustryCapacityCapMinor,
  getIndustryRetentionMultiplier,
} from '@/domain/companies/IndustryMechanicsService';
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
import { getPortfolioRevenueMultiplier } from '@/domain/economy/EffectiveEconomyCalculator';
import { getRevenuePerHour, getExpensesPerHour } from '@/domain/economy/EffectiveEconomyCalculator';
import { MoneyValue } from '@/domain/money/MoneyValue';

export type EconomyBreakdownLine = {
  id: string;
  amountMinorPerHour: number;
  kind: 'revenue' | 'expense';
};

export type CompanyEconomyBreakdown = {
  lines: EconomyBreakdownLine[];
  grossRevenueMinorPerHour: number;
  totalExpensesMinorPerHour: number;
  netMinorPerHour: number;
};

const PREFERRED_TRACK_REVENUE_BONUS = 1.08;

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

  if (industry?.mechanics?.primaryBottleneck === 'retention') {
    const retention = getIndustryRetentionMultiplier(company, industry);
    if (retention !== 1) {
      const delta = Math.round(revenueMinor * (retention - 1));
      lines.push({ id: 'retention_revenue', amountMinorPerHour: delta, kind: 'revenue' });
      revenueMinor = Math.round(revenueMinor * retention);
    }
  }

  const beforeCapacity = revenueMinor;
  if (industry) {
    revenueMinor = applyIndustryRevenueConstraints(
      company,
      config,
      MoneyValue.fromMinor(revenueMinor),
    ).amountMinorUnits;
    const capacityCap = getIndustryCapacityCapMinor(company, industry);
    if (capacityCap != null && beforeCapacity > capacityCap) {
      lines.push({
        id: 'capacity_cap_revenue',
        amountMinorPerHour: capacityCap - beforeCapacity,
        kind: 'revenue',
      });
    }
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

  const actualNet = getRevenuePerHour(company, config, marketState, subsidiaries, nowUnix)
    .subtract(getExpensesPerHour(company, config, marketState, nowUnix))
    .amountMinorUnits;
  const lineNet = revenueMinor - expenseMinor;

  return {
    lines,
    grossRevenueMinorPerHour: revenueMinor,
    totalExpensesMinorPerHour: expenseMinor,
    netMinorPerHour: lineNet === actualNet ? lineNet : actualNet,
  };
}
