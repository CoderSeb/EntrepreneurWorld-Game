import { AppState } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { PlayerState } from '@/domain/core/PlayerState';
import { MarketState } from '@/domain/core/AppState';
import { calculateForHours } from '@/domain/economy/IncomeExpenseCalculator';
import { applyCompanyIncomeForHours } from '@/domain/economy/CompanyIncomeService';
import { calculateOfflineProgress } from '@/domain/economy/OfflineProgressCalculator';
import { createSimulationResult, SimulationResult } from '@/domain/economy/SimulationResult';
import { EconomyConfig } from '@/domain/config/EconomyConfig';

export function simulateTick(
  _player: PlayerState,
  companies: CompanyState[],
  deltaSeconds: number,
  config: EconomyConfig,
  marketState: MarketState,
): SimulationResult {
  const hours = deltaSeconds / 3600;
  const gross = calculateForHours(companies, hours, config, marketState, 'income');
  const expenses = calculateForHours(companies, hours, config, marketState, 'expense');
  const net = applyCompanyIncomeForHours(companies, hours, config, marketState);

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
  _player: PlayerState,
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
  applyCompanyIncomeForHours(
    companies,
    result.effectiveHours,
    config,
    marketState,
  );
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
