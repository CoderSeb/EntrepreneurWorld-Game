import { EconomyConfig, OfflineEfficiencySegment } from '@/domain/config/EconomyConfig';
import { MarketState } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { calculateForHours } from '@/domain/economy/IncomeExpenseCalculator';
import { createSimulationResult, SimulationResult } from '@/domain/economy/SimulationResult';

function findSegmentForHour(
  hour: number,
  segments: OfflineEfficiencySegment[],
): OfflineEfficiencySegment | null {
  for (const segment of segments) {
    const inRange =
      hour >= segment.fromHours &&
      (segment.toHours === null || hour < segment.toHours);
    if (inRange) {
      return segment;
    }
  }
  return null;
}

export function calculateEffectiveHours(
  offlineHours: number,
  config: EconomyConfig,
): number {
  let effectiveHours = 0;
  let cursor = 0;

  while (cursor < offlineHours) {
    const segment = findSegmentForHour(cursor, config.offlineEfficiency);
    if (!segment) {
      break;
    }

    let segmentEnd = offlineHours;
    if (segment.toHours !== null) {
      segmentEnd = Math.min(offlineHours, segment.toHours);
    }

    const hoursInSegment = segmentEnd - cursor;
    effectiveHours += hoursInSegment * segment.multiplier;
    cursor = segmentEnd;
  }

  return effectiveHours;
}

export function calculateOfflineProgress(
  companies: CompanyState[],
  offlineDurationSeconds: number,
  config: EconomyConfig,
  marketState: MarketState,
): SimulationResult {
  const result = createSimulationResult();
  const rawHours = offlineDurationSeconds / 3600;
  const cappedHours = Math.min(rawHours, config.maxOfflineHoursRewarded);
  const effectiveHours = calculateEffectiveHours(cappedHours, config);

  const gross = calculateForHours(companies, effectiveHours, config, marketState, 'income');
  const expenses = calculateForHours(companies, effectiveHours, config, marketState, 'expense');

  result.grossIncome = gross;
  result.totalExpenses = expenses;
  result.netIncome = gross.subtract(expenses);
  result.effectiveHours = effectiveHours;
  result.rawOfflineHours = rawHours;
  result.cappedOfflineHours = cappedHours;
  return result;
}
