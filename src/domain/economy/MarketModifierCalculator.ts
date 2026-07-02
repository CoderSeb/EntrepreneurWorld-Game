import { MarketState } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';

export function getRevenueMultiplier(marketState: MarketState, industryId: string): number {
  let multiplier = 1;
  for (const eventPayload of marketState.active_events ?? []) {
    if (!eventAffectsIndustry(eventPayload, industryId)) {
      continue;
    }
    multiplier *= eventPayload.revenue_multiplier ?? 1;
  }
  return multiplier;
}

export function getExpenseMultiplier(marketState: MarketState, industryId: string): number {
  let multiplier = 1;
  for (const eventPayload of marketState.active_events ?? []) {
    if (!eventAffectsIndustry(eventPayload, industryId)) {
      continue;
    }
    multiplier *= eventPayload.expense_multiplier ?? 1;
  }
  return multiplier;
}

function eventAffectsIndustry(
  eventPayload: { affects_industry_ids?: string[] },
  industryId: string,
): boolean {
  const affected = eventPayload.affects_industry_ids ?? [];
  if (affected.length === 0) {
    return true;
  }
  if (!industryId) {
    return true;
  }
  return affected.includes(industryId);
}
