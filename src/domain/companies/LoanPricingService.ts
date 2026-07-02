import { LoanProductDefinition } from '@/domain/config/EconomyConfig';

/** Reference annual rate at rank 1 used to scale rank discounts onto product config rates. */
export const BASE_LOAN_ANNUAL_RATE = 0.15;
export const MIN_LOAN_ANNUAL_RATE = 0.05;
const HOURS_PER_YEAR = 8760;

export function effectiveAnnualInterestRate(businessRank: number): number {
  const discountPerRank = 0.005;
  return Math.max(MIN_LOAN_ANNUAL_RATE, BASE_LOAN_ANNUAL_RATE - (Math.max(1, businessRank) - 1) * discountPerRank);
}

export function hourlyRateFromAnnualRate(annualRate: number): number {
  return annualRate / HOURS_PER_YEAR;
}

export function rankLoanRateFactor(businessRank: number): number {
  return effectiveAnnualInterestRate(businessRank) / BASE_LOAN_ANNUAL_RATE;
}

export function effectiveMaxLoanAmount(product: LoanProductDefinition, businessRank: number): number {
  const growthPerRank = 0.12;
  return Math.floor(product.maxAmountMinor * (1 + (Math.max(1, businessRank) - 1) * growthPerRank));
}

export function effectiveLoanTerms(product: LoanProductDefinition, businessRank: number) {
  const hourlyRate = product.interestRateHourly * rankLoanRateFactor(businessRank);
  const annualRate = hourlyRate * HOURS_PER_YEAR;
  return {
    annualRate,
    hourlyRate,
    maxAmountMinor: effectiveMaxLoanAmount(product, businessRank),
  };
}

export function formatAnnualRatePercent(annualRate: number): string {
  return `${(annualRate * 100).toFixed(1)}%`;
}
