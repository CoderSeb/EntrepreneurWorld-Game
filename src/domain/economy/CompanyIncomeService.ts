import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { MarketState } from '@/domain/core/AppState';
import { CompanyState, isSubsidiary } from '@/domain/core/CompanyState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import {
  getExpensesPerHour,
  getRevenuePerHour,
} from '@/domain/economy/EffectiveEconomyCalculator';

export function applyCompanyIncomeForHours(
  companies: CompanyState[],
  hours: number,
  config: EconomyConfig,
  marketState: MarketState,
): MoneyValue {
  const subsidiaries = companies.filter(isSubsidiary);
  let totalNet = MoneyValue.zero();

  for (const company of subsidiaries) {
    const revenue = getRevenuePerHour(company, config, marketState, subsidiaries).multiplyScalar(
      hours,
    );
    const expenses = getExpensesPerHour(company, config, marketState).multiplyScalar(hours);
    const net = revenue.subtract(expenses);
    company.cashBalance = company.cashBalance.add(net);
    if (net.amountMinorUnits > 0) {
      company.lifetimeProfitMinor += net.amountMinorUnits;
    }
    totalNet = totalNet.add(net);
  }

  return totalNet;
}

export function calculateHourlyNetMinor(
  companies: CompanyState[],
  config: EconomyConfig,
  marketState: MarketState,
): number {
  const subsidiaries = companies.filter(isSubsidiary);
  let total = 0;
  for (const company of subsidiaries) {
    const revenue = getRevenuePerHour(company, config, marketState, subsidiaries);
    const expenses = getExpensesPerHour(company, config, marketState);
    total += revenue.subtract(expenses).amountMinorUnits;
  }
  return total;
}
