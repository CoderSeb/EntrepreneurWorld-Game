import {
  EconomyConfig,
  getAutomationLevel,
  getIndustry,
  getManager,
} from '@/domain/config/EconomyConfig';
import { MarketState } from '@/domain/core/AppState';
import { CompanyState, isHolding } from '@/domain/core/CompanyState';
import {
  getExecutiveSalaryMinor,
  isExecutiveHired,
} from '@/domain/companies/ExecutiveContracts';
import {
  getActivityExpenseMultiplier,
  getActivityRevenueMultiplier,
} from '@/domain/companies/ActivityEffectService';
import { applyIndustryRevenueConstraints,
  getIndustryLeverageInterestPerHourMinor,
} from '@/domain/companies/IndustryMechanicsService';
import {
  employeePayrollPerHourMinor,
  employeeRevenuePerHourMinor,
} from '@/domain/companies/EmployeeService';
import { getTrackLevel } from '@/domain/companies/UpgradeTrackService';
import { MoneyValue } from '@/domain/money/MoneyValue';
import {
  getExpenseMultiplier,
  getRevenueMultiplier,
} from '@/domain/economy/MarketModifierCalculator';
import {
  getPolicyExpenseMultiplier,
  getPolicyRevenueMultiplier,
} from '@/domain/companies/ExecutivePolicyMultipliers';
import { getIntegrationDebtExpensePerHourMinor } from '@/domain/companies/AcquisitionService';
import {
  getExpenseMultiplier as getTrackExpenseMultiplier,
  getRevenueMultiplier as getTrackRevenueMultiplier,
} from '@/domain/companies/UpgradeTrackService';

export function getRevenuePerHour(
  company: CompanyState,
  config: EconomyConfig,
  marketState: MarketState,
  subsidiaries: CompanyState[] = [],
  nowUnix: number = Math.floor(Date.now() / 1000),
): MoneyValue {
  if (isHolding(company)) {
    return MoneyValue.zero();
  }

  let revenue = company.revenuePerHour;
  revenue = revenue.add(
    MoneyValue.fromMinor(
      employeeRevenuePerHourMinor(company.employeeCount, company.payrollLevel, company.level),
    ),
  );
  revenue = revenue.multiplyScalar(automationRevenueMultiplier(company, config));
  revenue = revenue.multiplyScalar(executiveRevenueMultiplier(company, config, nowUnix));
  revenue = revenue.multiplyScalar(preferredTrackRevenueMultiplier(company, config));
  revenue = revenue.multiplyScalar(getTrackRevenueMultiplier(company, config));
  revenue = revenue.multiplyScalar(getPortfolioRevenueMultiplier(company, subsidiaries));
  revenue = revenue.multiplyScalar(getRevenueMultiplier(marketState, company.industryId));
  revenue = revenue.multiplyScalar(getActivityRevenueMultiplier(company, nowUnix));
  revenue = revenue.multiplyScalar(getPolicyRevenueMultiplier(company, config, nowUnix));
  revenue = applyIndustryRevenueConstraints(company, config, revenue);
  return revenue;
}

export function getExpensesPerHour(
  company: CompanyState,
  config: EconomyConfig,
  marketState: MarketState,
  nowUnix: number = Math.floor(Date.now() / 1000),
): MoneyValue {
  if (isHolding(company)) {
    return MoneyValue.zero();
  }

  let expenses = company.expensesPerHour;
  expenses = expenses.add(
    MoneyValue.fromMinor(employeePayrollPerHourMinor(company.employeeCount, company.payrollLevel)),
  );
  expenses = expenses.multiplyScalar(automationExpenseMultiplier(company, config));
  expenses = expenses.multiplyScalar(executiveExpenseMultiplier(company, config, nowUnix));
  expenses = expenses.add(executiveSalaries(company, config, nowUnix));
  expenses = expenses.multiplyScalar(getTrackExpenseMultiplier(company, config));
  expenses = expenses.multiplyScalar(getExpenseMultiplier(marketState, company.industryId));
  expenses = expenses.multiplyScalar(getActivityExpenseMultiplier(company, nowUnix));
  expenses = expenses.multiplyScalar(getPolicyExpenseMultiplier(company, config, nowUnix));
  const industry = getIndustry(config, company.industryId);
  if (industry) {
    expenses = expenses.add(
      MoneyValue.fromMinor(getIndustryLeverageInterestPerHourMinor(company, industry)),
    );
  }
  expenses = expenses.add(MoneyValue.fromMinor(getIntegrationDebtExpensePerHourMinor(company)));
  return expenses;
}

function automationRevenueMultiplier(company: CompanyState, config: EconomyConfig): number {
  const definition = config.automationLevels.find((entry) => entry.level === company.automationLevel);
  return definition?.revenueMultiplier ?? 1;
}

function automationExpenseMultiplier(company: CompanyState, config: EconomyConfig): number {
  const definition = config.automationLevels.find((entry) => entry.level === company.automationLevel);
  return definition?.expenseMultiplier ?? 1;
}

function executiveRevenueMultiplier(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
): number {
  let multiplier = 1;
  for (const role of config.managers) {
    if (!isExecutiveHired(company, role.id, nowUnix)) {
      continue;
    }
    multiplier *= role.revenueMultiplier;
  }
  return multiplier;
}

function executiveExpenseMultiplier(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
): number {
  let multiplier = 1;
  for (const role of config.managers) {
    if (!isExecutiveHired(company, role.id, nowUnix)) {
      continue;
    }
    multiplier *= role.expenseMultiplier;
  }
  return multiplier;
}

function executiveSalaries(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
): MoneyValue {
  let total = 0;
  for (const role of config.managers) {
    if (!isExecutiveHired(company, role.id, nowUnix)) {
      continue;
    }
    const definition = getManager(config, role.id);
    if (definition) {
      total += getExecutiveSalaryMinor(company, definition);
    }
  }
  return MoneyValue.fromMinor(total);
}

export const PREFERRED_TRACK_REVENUE_BONUS = 1.08;

export function getPortfolioRevenueMultiplier(
  company: CompanyState,
  subsidiaries: CompanyState[],
): number {
  if (subsidiaries.length === 0) {
    return 1;
  }

  let multiplier = 1;
  const uniqueIndustries = new Set(subsidiaries.map((entry) => entry.industryId));
  if (uniqueIndustries.size >= 2) {
    multiplier *= 1.02;
  }

  const sameIndustry = subsidiaries.filter((entry) => entry.industryId === company.industryId);
  const duplicateIndex = sameIndustry.findIndex((entry) => entry.id === company.id);
  if (duplicateIndex > 0) {
    multiplier *= 0.95;
  }

  return multiplier;
}

function preferredTrackRevenueMultiplier(company: CompanyState, config: EconomyConfig): number {
  const industry = getIndustry(config, company.industryId);
  if (!industry?.preferredTrackId) {
    return 1;
  }
  const level = getTrackLevel(company, industry.preferredTrackId);
  return level >= 1 ? PREFERRED_TRACK_REVENUE_BONUS : 1;
}

