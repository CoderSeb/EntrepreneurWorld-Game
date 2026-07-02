import { MoneyValue } from '@/domain/money/MoneyValue';
import { duplicateLoan, LoanState } from '@/domain/core/LoanState';

export type PlayerState = {
  playerId: string;
  cashBalance: MoneyValue;
  businessRank: number;
  maxCompanies: number;
  holdingCompanyId: string;
  onboardingCompleted: boolean;
  activeLoans: LoanState[];
};

export function createPlayerState(): PlayerState {
  return {
    playerId: '',
    cashBalance: MoneyValue.zero(),
    businessRank: 1,
    maxCompanies: 3,
    holdingCompanyId: '',
    onboardingCompleted: false,
    activeLoans: [],
  };
}

export function hasHolding(player: PlayerState): boolean {
  return player.holdingCompanyId.length > 0;
}

export function duplicatePlayerState(player: PlayerState): PlayerState {
  return {
    playerId: player.playerId,
    cashBalance: MoneyValue.fromMinor(player.cashBalance.amountMinorUnits),
    businessRank: player.businessRank,
    maxCompanies: player.maxCompanies,
    holdingCompanyId: player.holdingCompanyId,
    onboardingCompleted: player.onboardingCompleted,
    activeLoans: player.activeLoans.map(duplicateLoan),
  };
}
