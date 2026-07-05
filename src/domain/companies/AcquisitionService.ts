import {
  AcquisitionTargetDefinition,
  EconomyConfig,
  getAcquisitionTarget,
  getIndustry,
  getMaxCompaniesForLevel,
} from '@/domain/config/EconomyConfig';
import { AppState, getSubsidiaries } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { fail, ok, OperationResult } from '@/domain/core/OperationResult';
import { hasHolding } from '@/domain/core/PlayerState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { createSubsidiary } from '@/domain/companies/CompanyFactory';
import { applyRankIfImproved } from '@/domain/progression/ProgressionService';
import { tryPayForConglomerateInvestment } from '@/domain/treasury/CompanyTreasury';

export function completeAcquisition(
  appState: AppState,
  config: EconomyConfig,
  targetId: string,
  companyName: string,
  nowUnix: number,
): OperationResult<CompanyState> {
  if (!hasHolding(appState.player)) {
    return fail('holding_required', 'Create a holding company first');
  }

  const target = getAcquisitionTarget(config, targetId);
  if (!target) {
    return fail('unknown_acquisition', 'Acquisition target not found');
  }

  if (appState.player.businessRank < target.minBusinessRank) {
    return fail('rank_too_low', `Requires business rank ${target.minBusinessRank}`);
  }

  const subsidiaryCount = getSubsidiaries(appState).length;
  const maxSubsidiaries = getMaxCompaniesForLevel(config, appState.player.businessRank);
  if (subsidiaryCount >= maxSubsidiaries) {
    return fail('company_limit_reached', 'Maximum subsidiary count reached');
  }

  const industry = getIndustry(config, target.industryId);
  if (!industry) {
    return fail('unknown_industry', 'Target industry not found');
  }

  const trimmedName = companyName.trim();
  if (!trimmedName) {
    return fail('invalid_name', 'Company name must not be empty');
  }

  if (!tryPayForConglomerateInvestment(appState, target.costMinor)) {
    return fail('insufficient_funds', 'Not enough investable cash for this acquisition');
  }

  const company = createSubsidiary(industry, trimmedName, nowUnix);
  company.revenuePerHour = company.revenuePerHour.add(
    MoneyValue.fromMinor(target.revenueBoostPerHourMinor),
  );
  company.reputation = Math.max(0, 1 - target.startingReputationPenalty);
  company.integrationDebtMinor = target.integrationDebtMinor;
  company.integrationComplete = target.integrationDebtMinor <= 0;
  company.riskLevel = Math.min(1, industry.riskProfile + target.riskPenalty);
  company.lifetimeProfitMinor = 0;

  appState.companies.push(company);
  applyRankIfImproved(appState, config);
  return ok(company);
}

export function getAvailableAcquisitionTargets(
  config: EconomyConfig,
  businessRank: number,
): AcquisitionTargetDefinition[] {
  return config.acquisitionTargets.filter((target) => businessRank >= target.minBusinessRank);
}

export function getIntegrationDebtExpensePerHourMinor(company: CompanyState): number {
  if (company.integrationComplete || company.integrationDebtMinor <= 0) {
    return 0;
  }
  return Math.round(company.integrationDebtMinor * 0.00012);
}

export function accrueIntegrationDebtInterest(
  company: CompanyState,
  deltaSeconds: number,
): void {
  if (company.integrationComplete || company.integrationDebtMinor <= 0) {
    return;
  }

  const hours = deltaSeconds / 3600;
  const interest = Math.round(company.integrationDebtMinor * 0.00005 * hours);
  company.integrationDebtMinor += interest;
}

export function payIntegrationDebt(
  appState: AppState,
  companyId: string,
  amountMinor: number,
): OperationResult<number> {
  const company = appState.companies.find((entry) => entry.id === companyId);
  if (!company) {
    return fail('company_not_found', 'Company not found');
  }
  if (company.integrationComplete) {
    return fail('integration_complete', 'Integration already complete');
  }

  const payment = Math.min(amountMinor, company.integrationDebtMinor, company.cashBalance.amountMinorUnits);
  if (payment <= 0) {
    return fail('insufficient_funds', 'No cash available for integration payment');
  }

  company.cashBalance = company.cashBalance.subtract(MoneyValue.fromMinor(payment));
  company.integrationDebtMinor -= payment;
  if (company.integrationDebtMinor <= 0) {
    company.integrationDebtMinor = 0;
    company.integrationComplete = true;
    company.reputation = Math.min(1, company.reputation + 0.1);
  }

  return ok(payment);
}
