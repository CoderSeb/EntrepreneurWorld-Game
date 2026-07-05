import { AppState, findCompany } from '@/domain/core/AppState';
import { CompanyState, isHolding, isSubsidiary } from '@/domain/core/CompanyState';
import { PlayerState } from '@/domain/core/PlayerState';
import { MoneyValue } from '@/domain/money/MoneyValue';

export function findHoldingCompany(appState: AppState): CompanyState | null {
  if (appState.player.holdingCompanyId) {
    const linked = findCompany(appState, appState.player.holdingCompanyId);
    if (linked && isHolding(linked)) {
      return linked;
    }
  }
  return appState.companies.find((company) => isHolding(company)) ?? null;
}

export function sumSubsidiaryCashMinor(appState: AppState): number {
  return appState.companies
    .filter(isSubsidiary)
    .reduce((sum, company) => sum + company.cashBalance.amountMinorUnits, 0);
}

export function sumConglomerateLiquidCashMinor(appState: AppState): number {
  return appState.companies.reduce(
    (sum, company) => sum + company.cashBalance.amountMinorUnits,
    0,
  );
}

export function tryDeductFromCompany(company: CompanyState, amountMinor: number): boolean {
  if (company.cashBalance.amountMinorUnits < amountMinor) {
    return false;
  }
  company.cashBalance = company.cashBalance.subtract(MoneyValue.fromMinor(amountMinor));
  return true;
}

export function tryDeductFromPersonal(player: PlayerState, amountMinor: number): boolean {
  if (player.personalCashBalance.amountMinorUnits < amountMinor) {
    return false;
  }
  player.personalCashBalance = player.personalCashBalance.subtract(MoneyValue.fromMinor(amountMinor));
  return true;
}

export function tryDeductFromHolding(appState: AppState, amountMinor: number): boolean {
  const holding = findHoldingCompany(appState);
  if (!holding) {
    return false;
  }
  return tryDeductFromCompany(holding, amountMinor);
}

export function tryDeductForSubsidiaryExpense(
  appState: AppState,
  company: CompanyState,
  amountMinor: number,
): boolean {
  if (tryDeductFromCompany(company, amountMinor)) {
    return true;
  }
  return tryDeductFromHolding(appState, amountMinor);
}

export function availableFundingForSubsidiaryMinor(
  appState: AppState,
  company: CompanyState,
): number {
  const holding = findHoldingCompany(appState);
  return (
    company.cashBalance.amountMinorUnits + (holding?.cashBalance.amountMinorUnits ?? 0)
  );
}

export function availableFundingForFoundingMinor(appState: AppState): number {
  const holding = findHoldingCompany(appState);
  return (
    (holding?.cashBalance.amountMinorUnits ?? 0) +
    appState.player.personalCashBalance.amountMinorUnits
  );
}
