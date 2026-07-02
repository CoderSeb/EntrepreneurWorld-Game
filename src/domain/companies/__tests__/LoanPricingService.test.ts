import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { effectiveLoanTerms, rankLoanRateFactor } from '@/domain/companies/LoanPricingService';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);
describe('LoanPricingService', () => {
  const starterLoan = config.loanProducts.find((product) => product.id === 'starter_loan')!;
  const growthLoan = config.loanProducts.find((product) => product.id === 'growth_loan')!;

  it('derives hourly rate from product config scaled by rank discount', () => {
    const rank1 = effectiveLoanTerms(starterLoan, 1);
    expect(rank1.hourlyRate).toBeCloseTo(starterLoan.interestRateHourly, 8);
    expect(rank1.annualRate).toBeCloseTo(starterLoan.interestRateHourly * 8760, 4);

    const rank10 = effectiveLoanTerms(starterLoan, 10);
    expect(rank10.hourlyRate).toBeCloseTo(starterLoan.interestRateHourly * rankLoanRateFactor(10), 8);
    expect(rank10.annualRate).toBeLessThan(rank1.annualRate);
  });

  it('uses the same configured rate for products at the same rank when rates match', () => {
    const starter = effectiveLoanTerms(starterLoan, 5);
    const growth = effectiveLoanTerms(growthLoan, 5);
    expect(growth.hourlyRate).toBeCloseTo(starter.hourlyRate, 8);
    expect(growth.maxAmountMinor).toBeGreaterThan(starter.maxAmountMinor);
  });

  it('applies rank discount to configured product rate', () => {
    const highRank = effectiveLoanTerms(starterLoan, 20);
    const lowRank = effectiveLoanTerms(starterLoan, 1);
    expect(highRank.hourlyRate).toBeLessThan(lowRank.hourlyRate);
    expect(highRank.hourlyRate / lowRank.hourlyRate).toBeCloseTo(rankLoanRateFactor(20), 4);
  });
});
