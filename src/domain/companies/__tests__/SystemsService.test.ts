import { getIndustry } from '@/domain/config/EconomyConfig';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import {
  getMaxSystemsLevel,
  getNextSystemsUpgradeCostMinor,
  getSystemsUpgradeCostMultiplier,
} from '@/domain/companies/SystemsService';
import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { CompanyState } from '@/domain/core/CompanyState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

function makeCompany(industryId: string, automationLevel = 0): CompanyState {
  const industry = getIndustry(config, industryId)!;
  return {
    id: `co-${industryId}`,
    name: 'Test Co',
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId,
    level: 1,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel,
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

describe('SystemsService', () => {
  it('limits max systems level by automation potential', () => {
    const cleaning = getIndustry(config, 'cleaning')!;
    const software = getIndustry(config, 'software')!;

    expect(getMaxSystemsLevel(cleaning, config)).toBe(1);
    expect(getMaxSystemsLevel(software, config)).toBe(3);
  });

  it('applies lower upgrade costs for high automation potential industries', () => {
    const cleaning = getIndustry(config, 'cleaning')!;
    const software = getIndustry(config, 'software')!;

    expect(getSystemsUpgradeCostMultiplier(software)).toBeLessThan(
      getSystemsUpgradeCostMultiplier(cleaning),
    );
  });

  it('returns null next cost when industry max systems level is reached', () => {
    const cleaning = getIndustry(config, 'cleaning')!;
    const company = makeCompany('cleaning', 1);

    expect(getNextSystemsUpgradeCostMinor(company, cleaning, config)).toBeNull();
  });
});
