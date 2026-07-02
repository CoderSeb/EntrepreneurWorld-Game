import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { CompanyState } from '@/domain/core/CompanyState';
import { getIndustry, getIndustryFoundingCost, parseEconomyConfig } from '@/domain/config/EconomyConfig';
import {
  getPortfolioRevenueMultiplier,
  getRevenuePerHour,
} from '@/domain/economy/EffectiveEconomyCalculator';
import { applyLevelUpgrade } from '@/domain/economy/UpgradeCalculator';
import { MoneyValue } from '@/domain/money/MoneyValue';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

function makeSubsidiary(industryId: string): CompanyState {
  const industry = getIndustry(config, industryId)!;
  return {
    id: `co-${industryId}`,
    name: industry.displayName,
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId,
    level: 1,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel: 0,
    executiveContracts: {},
    lifetimeProfitMinor: 0,
    employeeCount: 0,
    payrollLevel: 1,
    revenuePerHour: MoneyValue.fromMinor(industry.baseRevenuePerHourMinor),
    expensesPerHour: MoneyValue.fromMinor(industry.baseExpensesPerHourMinor),
    riskLevel: industry.riskProfile,
    upgradeTrackLevels: {},
    createdAtUnix: 0,
    updatedAtUnix: 0,
  };
}

describe('portfolio economy modifiers', () => {
  it('rewards diversified industries and penalizes duplicate industry slots', () => {
    const cafe = makeSubsidiary('cafe');
    const cleaning = makeSubsidiary('cleaning');
    const cafeDuplicate = { ...makeSubsidiary('cafe'), id: 'co-cafe-2' };

    expect(getPortfolioRevenueMultiplier(cafe, [cafe, cleaning])).toBeCloseTo(1.02);
    expect(getPortfolioRevenueMultiplier(cafeDuplicate, [cafe, cafeDuplicate])).toBe(0.95);
  });
});

describe('industry balance', () => {
  it('uses tiered founding costs for later industries', () => {
    const cafe = getIndustry(config, 'cafe')!;
    const realEstate = getIndustry(config, 'real_estate')!;

    expect(getIndustryFoundingCost(cafe, config)).toBe(2_500_000);
    expect(getIndustryFoundingCost(realEstate, config)).toBe(8_000_000);
  });

  it('does not let a fresh tier-3 company beat a invested tier-1 company at equal playtime', () => {
    const cafeIndustry = getIndustry(config, 'cafe')!;
    let cafe = makeSubsidiary('cafe');
    for (let i = 0; i < 3; i += 1) {
      cafe = applyLevelUpgrade(cafe, cafeIndustry, 0);
    }
    cafe.upgradeTrackLevels.operations = 3;

    const realEstate = makeSubsidiary('real_estate');
    const subsidiaries = [cafe, realEstate];

    const cafeRevenue = getRevenuePerHour(cafe, config, {}, subsidiaries).amountMinorUnits;
    const realEstateRevenue = getRevenuePerHour(realEstate, config, {}, subsidiaries).amountMinorUnits;

    expect(cafeRevenue).toBeGreaterThan(realEstateRevenue);
  });

  it('does not let a fresh real estate company beat a level-4 cafe on base revenue alone', () => {
    const cafeIndustry = getIndustry(config, 'cafe')!;
    let cafe = makeSubsidiary('cafe');
    for (let i = 0; i < 3; i += 1) {
      cafe = applyLevelUpgrade(cafe, cafeIndustry, 0);
    }

    const realEstate = makeSubsidiary('real_estate');
    const subsidiaries = [cafe, realEstate];

    const cafeRevenue = getRevenuePerHour(cafe, config, {}, subsidiaries).amountMinorUnits;
    const realEstateRevenue = getRevenuePerHour(realEstate, config, {}, subsidiaries).amountMinorUnits;

    expect(cafeRevenue).toBeGreaterThan(realEstateRevenue);
  });
});
