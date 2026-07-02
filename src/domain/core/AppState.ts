import { PurchaseState, createPurchaseState, duplicatePurchaseState } from '@/domain/core/PurchaseState';
import { PlayerState, createPlayerState, duplicatePlayerState } from '@/domain/core/PlayerState';
import { CompanyState, duplicateCompanyState, isSubsidiary } from '@/domain/core/CompanyState';

export type MarketState = {
  active_events?: MarketEventPayload[];
  [key: string]: unknown;
};

export type MarketEventPayload = {
  id: string;
  display_name: string;
  revenue_multiplier: number;
  expense_multiplier: number;
  affects_industry_ids: string[];
  started_at_unix: number;
  ends_at_unix: number;
};

export type AppState = {
  player: PlayerState;
  companies: CompanyState[];
  marketState: MarketState;
  economyVersion: number;
  createdAtUnix: number;
  lastSeenAtUnix: number;
  activityCooldowns: Record<string, number>;
  purchases: PurchaseState;
  settings: Record<string, unknown>;
};

export function createAppState(): AppState {
  return {
    player: createPlayerState(),
    companies: [],
    marketState: {},
    economyVersion: 1,
    createdAtUnix: 0,
    lastSeenAtUnix: 0,
    activityCooldowns: {},
    purchases: createPurchaseState(),
    settings: {},
  };
}

export function getHoldingCompany(state: AppState): CompanyState | null {
  for (const company of state.companies) {
    if (company.id === state.player.holdingCompanyId) {
      return company;
    }
  }
  return null;
}

export function getSubsidiaries(state: AppState): CompanyState[] {
  return state.companies.filter(isSubsidiary);
}

export function duplicateAppState(state: AppState): AppState {
  return {
    player: duplicatePlayerState(state.player),
    companies: state.companies.map(duplicateCompanyState),
    marketState: JSON.parse(JSON.stringify(state.marketState)) as MarketState,
    economyVersion: state.economyVersion,
    createdAtUnix: state.createdAtUnix,
    lastSeenAtUnix: state.lastSeenAtUnix,
    activityCooldowns: { ...state.activityCooldowns },
    purchases: duplicatePurchaseState(state.purchases),
    settings: { ...state.settings },
  };
}

export function findCompany(state: AppState, companyId: string): CompanyState | null {
  return state.companies.find((c) => c.id === companyId) ?? null;
}
