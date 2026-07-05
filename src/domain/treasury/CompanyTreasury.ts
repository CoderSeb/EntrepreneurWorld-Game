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
  return getFoundingFundingBreakdown(appState).totalMinor;
}

export type FoundingFundingBreakdown = {
  holdingMinor: number;
  subsidiaryMinor: number;
  personalMinor: number;
  totalMinor: number;
};

export function getFoundingFundingBreakdown(appState: AppState): FoundingFundingBreakdown {
  const holding = findHoldingCompany(appState);
  const holdingMinor = holding?.cashBalance.amountMinorUnits ?? 0;
  const subsidiaryMinor = sumSubsidiaryCashMinor(appState);
  const personalMinor = appState.player.personalCashBalance.amountMinorUnits;
  return {
    holdingMinor,
    subsidiaryMinor,
    personalMinor,
    totalMinor: holdingMinor + subsidiaryMinor + personalMinor,
  };
}

type ConglomeratePaymentStep =
  | { source: 'holding'; company: CompanyState; amountMinor: number }
  | { source: 'subsidiary'; company: CompanyState; amountMinor: number }
  | { source: 'personal'; amountMinor: number };

function buildConglomerateInvestmentPlan(
  appState: AppState,
  amountMinor: number,
): ConglomeratePaymentStep[] | null {
  if (amountMinor <= 0) {
    return [];
  }

  let remaining = amountMinor;
  const steps: ConglomeratePaymentStep[] = [];
  const holding = findHoldingCompany(appState);

  if (holding && holding.cashBalance.amountMinorUnits > 0) {
    const take = Math.min(remaining, holding.cashBalance.amountMinorUnits);
    steps.push({ source: 'holding', company: holding, amountMinor: take });
    remaining -= take;
  }

  if (remaining > 0) {
    const subsidiaries = appState.companies
      .filter(isSubsidiary)
      .sort((a, b) => b.cashBalance.amountMinorUnits - a.cashBalance.amountMinorUnits);

    for (const company of subsidiaries) {
      if (remaining <= 0) {
        break;
      }
      const take = Math.min(remaining, company.cashBalance.amountMinorUnits);
      if (take <= 0) {
        continue;
      }
      steps.push({ source: 'subsidiary', company, amountMinor: take });
      remaining -= take;
    }
  }

  if (remaining > 0) {
    if (appState.player.personalCashBalance.amountMinorUnits < remaining) {
      return null;
    }
    steps.push({ source: 'personal', amountMinor: remaining });
  }

  return steps;
}

/** Pay from holding treasury, then subsidiary cash, then personal wallet. */
export function tryPayForConglomerateInvestment(appState: AppState, amountMinor: number): boolean {
  const plan = buildConglomerateInvestmentPlan(appState, amountMinor);
  if (plan === null) {
    return false;
  }

  for (const step of plan) {
    if (step.source === 'personal') {
      if (!tryDeductFromPersonal(appState.player, step.amountMinor)) {
        return false;
      }
      continue;
    }
    if (!tryDeductFromCompany(step.company, step.amountMinor)) {
      return false;
    }
  }

  return true;
}
