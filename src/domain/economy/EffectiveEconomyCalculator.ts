import { EconomyConfig, getIndustry, getManager } from '@/domain/config/EconomyConfig';
import { MarketState } from '@/domain/core/AppState';
import { CompanyState, isHolding } from '@/domain/core/CompanyState';
import { isExecutiveHired } from '@/domain/companies/ExecutiveRoles';
import { getTrackLevel } from '@/domain/companies/UpgradeTrackService';
import { MoneyValue } from '@/domain/money/MoneyValue';
import {
  getExpenseMultiplier,
  getRevenueMultiplier,
} from '@/domain/economy/MarketModifierCalculator';
import {
  getExpenseMultiplier as getTrackExpenseMultiplier,
  getRevenueMultiplier as getTrackRevenueMultiplier,
} from '@/domain/companies/UpgradeTrackService';

export function getRevenuePerHour(
  company: CompanyState,
  config: EconomyConfig,
  marketState: MarketState,
  subsidiaries: CompanyState[] = [],
): MoneyValue {
  if (isHolding(company)) {
    return MoneyValue.zero();
  }

  let revenue = company.revenuePerHour;
  revenue = revenue.multiplyScalar(automationRevenueMultiplier(company, config));
  revenue = revenue.multiplyScalar(executiveRevenueMultiplier(company, config));
  revenue = revenue.multiplyScalar(preferredTrackRevenueMultiplier(company, config));
  revenue = revenue.multiplyScalar(getTrackRevenueMultiplier(company, config));
  revenue = revenue.multiplyScalar(getPortfolioRevenueMultiplier(company, subsidiaries));
  revenue = revenue.multiplyScalar(getRevenueMultiplier(marketState, company.industryId));
  return revenue;
}

export function getExpensesPerHour(
  company: CompanyState,
  config: EconomyConfig,
  marketState: MarketState,
): MoneyValue {
  if (isHolding(company)) {
    return MoneyValue.zero();
  }

  let expenses = company.expensesPerHour;
  expenses = expenses.multiplyScalar(automationExpenseMultiplier(company, config));
  expenses = expenses.multiplyScalar(executiveExpenseMultiplier(company, config));
  expenses = expenses.add(executiveSalaries(company, config));
  expenses = expenses.multiplyScalar(getTrackExpenseMultiplier(company, config));
  expenses = expenses.multiplyScalar(getExpenseMultiplier(marketState, company.industryId));
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

function executiveRevenueMultiplier(company: CompanyState, config: EconomyConfig): number {
  let multiplier = 1;
  for (const role of config.managers) {
    if (!isExecutiveHired(company, role.id)) {
      continue;
    }
    multiplier *= role.revenueMultiplier;
  }
  return multiplier;
}

function executiveExpenseMultiplier(company: CompanyState, config: EconomyConfig): number {
  let multiplier = 1;
  for (const role of config.managers) {
    if (!isExecutiveHired(company, role.id)) {
      continue;
    }
    multiplier *= role.expenseMultiplier;
  }
  return multiplier;
}

function executiveSalaries(company: CompanyState, config: EconomyConfig): MoneyValue {
  let total = 0;
  for (const role of config.managers) {
    if (!isExecutiveHired(company, role.id)) {
      continue;
    }
    const definition = getManager(config, role.id);
    if (definition) {
      total += definition.salaryPerHourMinor;
    }
  }
  return MoneyValue.fromMinor(total);
}

const PREFERRED_TRACK_REVENUE_BONUS = 1.08;

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
