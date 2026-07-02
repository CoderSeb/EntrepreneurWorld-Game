import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { AppState } from '@/domain/core/AppState';
import { PlayerState } from '@/domain/core/PlayerState';
import { CompanyState } from '@/domain/core/CompanyState';
import { MarketState } from '@/domain/core/AppState';
import { calculateForHours } from '@/domain/economy/IncomeExpenseCalculator';
import { calculateOfflineProgress } from '@/domain/economy/OfflineProgressCalculator';
import { createSimulationResult, SimulationResult } from '@/domain/economy/SimulationResult';

export function simulateTick(
  player: PlayerState,
  companies: CompanyState[],
  deltaSeconds: number,
  config: EconomyConfig,
  marketState: MarketState,
): SimulationResult {
  const hours = deltaSeconds / 3600;
  const gross = calculateForHours(companies, hours, config, marketState, 'income');
  const expenses = calculateForHours(companies, hours, config, marketState, 'expense');
  const net = gross.subtract(expenses);

  player.cashBalance = player.cashBalance.add(net);

  const result = createSimulationResult();
  result.grossIncome = gross;
  result.totalExpenses = expenses;
  result.netIncome = net;
  result.effectiveHours = hours;
  result.rawOfflineHours = hours;
  result.cappedOfflineHours = hours;
  return result;
}

export function simulateOffline(
  player: PlayerState,
  companies: CompanyState[],
  offlineDurationSeconds: number,
  config: EconomyConfig,
  marketState: MarketState,
): SimulationResult {
  const result = calculateOfflineProgress(
    companies,
    offlineDurationSeconds,
    config,
    marketState,
  );
  player.cashBalance = player.cashBalance.add(result.netIncome);
  return result;
}

export function simulateOfflineForApp(
  appState: AppState,
  offlineDurationSeconds: number,
  config: EconomyConfig,
): SimulationResult {
  return simulateOffline(
    appState.player,
    appState.companies,
    offlineDurationSeconds,
    config,
    appState.marketState,
  );
}
