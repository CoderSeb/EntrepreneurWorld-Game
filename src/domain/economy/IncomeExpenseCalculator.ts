import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { MarketState } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import {
  getExpensesPerHour,
  getRevenuePerHour,
} from '@/domain/economy/EffectiveEconomyCalculator';

export function calculateHourlyGross(
  companies: CompanyState[],
  config: EconomyConfig,
  marketState: MarketState,
): MoneyValue {
  let total = MoneyValue.zero();
  const subsidiaries = companies.filter((company) => company.companyKind === 'subsidiary');
  for (const company of companies) {
    total = total.add(getRevenuePerHour(company, config, marketState, subsidiaries));
  }
  return total;
}

export function calculateHourlyExpenses(
  companies: CompanyState[],
  config: EconomyConfig,
  marketState: MarketState,
): MoneyValue {
  let total = MoneyValue.zero();
  for (const company of companies) {
    total = total.add(getExpensesPerHour(company, config, marketState));
  }
  return total;
}

export function calculateForHours(
  companies: CompanyState[],
  hours: number,
  config: EconomyConfig,
  marketState: MarketState,
  kind: 'income' | 'expense',
): MoneyValue {
  const hourly =
    kind === 'income'
      ? calculateHourlyGross(companies, config, marketState)
      : calculateHourlyExpenses(companies, config, marketState);
  return hourly.multiplyScalar(hours);
}
