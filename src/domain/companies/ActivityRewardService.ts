import { ActivityDefinition, EconomyConfig } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';
import { MarketState } from '@/domain/core/AppState';
import { getRevenuePerHour } from '@/domain/economy/EffectiveEconomyCalculator';

export function calculateActivityInstantCashMinor(
  activity: ActivityDefinition,
  company: CompanyState,
  config: EconomyConfig,
  marketState: MarketState,
  subsidiaries: CompanyState[],
  nowUnix: number,
): number {
  if (activity.rewardRevenueMinutes > 0) {
    const revenuePerHour = getRevenuePerHour(company, config, marketState, subsidiaries, nowUnix);
    return Math.round(revenuePerHour.amountMinorUnits * (activity.rewardRevenueMinutes / 60));
  }
  return activity.rewardMinor;
}
