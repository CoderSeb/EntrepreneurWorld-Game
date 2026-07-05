import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { AppState, findCompany } from '@/domain/core/AppState';
import { CompanyState, isSubsidiary } from '@/domain/core/CompanyState';
import { fail, ok, OperationResult } from '@/domain/core/OperationResult';
import { MoneyValue } from '@/domain/money/MoneyValue';
import {
  findHoldingCompany,
  tryDeductFromCompany,
  tryDeductFromHolding,
} from '@/domain/treasury/CompanyTreasury';

export type SalaryPreview = {
  grossMinor: number;
  taxMinor: number;
  netMinor: number;
  taxRate: number;
};

export function calculateSalaryPreview(
  grossMinor: number,
  config: EconomyConfig,
): SalaryPreview {
  const taxRate = config.treasury.salaryTaxRate;
  const taxMinor = Math.round(grossMinor * taxRate);
  return {
    grossMinor,
    taxMinor,
    netMinor: grossMinor - taxMinor,
    taxRate,
  };
}

export function transferDividendToHolding(
  appState: AppState,
  subsidiaryId: string,
  amountMinor: number,
  nowUnix: number,
  config: EconomyConfig,
): OperationResult<MoneyValue> {
  const subsidiary = findCompany(appState, subsidiaryId);
  if (!subsidiary || !isSubsidiary(subsidiary)) {
    return fail('company_not_found', 'Subsidiary not found');
  }

  const holding = findHoldingCompany(appState);
  if (!holding) {
    return fail('holding_required', 'Create a holding company first');
  }

  if (amountMinor < config.treasury.minTransferMinor) {
    return fail('transfer_too_small', 'Transfer amount is below minimum');
  }

  const amount = MoneyValue.fromMinor(amountMinor);
  if (!tryDeductFromCompany(subsidiary, amountMinor)) {
    return fail('insufficient_funds', 'Subsidiary does not have enough cash');
  }

  holding.cashBalance = holding.cashBalance.add(amount);
  subsidiary.updatedAtUnix = nowUnix;
  holding.updatedAtUnix = nowUnix;
  return ok(amount);
}

export function withdrawSalaryFromHolding(
  appState: AppState,
  grossMinor: number,
  config: EconomyConfig,
  nowUnix: number,
): OperationResult<SalaryPreview> {
  const holding = findHoldingCompany(appState);
  if (!holding) {
    return fail('holding_required', 'Create a holding company first');
  }

  if (grossMinor < config.treasury.minSalaryMinor) {
    return fail('salary_too_small', 'Salary amount is below minimum');
  }

  const preview = calculateSalaryPreview(grossMinor, config);
  if (!tryDeductFromHolding(appState, grossMinor)) {
    return fail('insufficient_funds', 'Holding treasury does not have enough cash');
  }

  appState.player.personalCashBalance = appState.player.personalCashBalance.add(
    MoneyValue.fromMinor(preview.netMinor),
  );
  holding.updatedAtUnix = nowUnix;
  return ok(preview);
}

export function getSubsidiaryTreasuryRows(appState: AppState): CompanyState[] {
  return appState.companies.filter(isSubsidiary);
}
