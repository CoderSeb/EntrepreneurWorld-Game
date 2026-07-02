import { MoneyValue } from '@/domain/money/MoneyValue';

export type SimulationResult = {
  grossIncome: MoneyValue;
  totalExpenses: MoneyValue;
  netIncome: MoneyValue;
  effectiveHours: number;
  rawOfflineHours: number;
  cappedOfflineHours: number;
};

export function createSimulationResult(): SimulationResult {
  return {
    grossIncome: MoneyValue.zero(),
    totalExpenses: MoneyValue.zero(),
    netIncome: MoneyValue.zero(),
    effectiveHours: 0,
    rawOfflineHours: 0,
    cappedOfflineHours: 0,
  };
}
