import { calculateOfflineProgress } from '@/domain/economy/OfflineProgressCalculator';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { MoneyValue } from '@/domain/money/MoneyValue';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

function makeSubsidiary(revenueMinor: number, expensesMinor: number) {
  return {
    id: 'c1',
    name: 'Test Co',
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId: 'cafe',
    level: 1,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel: 0,
    executiveContracts: {},
    lifetimeProfitMinor: 0,
    employeeCount: 0,
    payrollLevel: 1,
    revenuePerHour: MoneyValue.fromMinor(revenueMinor),
    expensesPerHour: MoneyValue.fromMinor(expensesMinor),
    riskLevel: 0.2,
    upgradeTrackLevels: {},
    createdAtUnix: 0,
    updatedAtUnix: 0,
  };
}

describe('OfflineProgressCalculator', () => {
  it('caps offline hours at config max', () => {
    const companies = [makeSubsidiary(120_000, 70_000)];
    const result = calculateOfflineProgress(companies, 999999 * 3600, config, {});
    expect(result.cappedOfflineHours).toBe(config.maxOfflineHoursRewarded);
  });

  it('applies diminishing returns beyond 72h', () => {
    const companies = [makeSubsidiary(120_000, 70_000)];
    const short = calculateOfflineProgress(companies, 48 * 3600, config, {});
    const long = calculateOfflineProgress(companies, 200 * 3600, config, {});
    expect(long.effectiveHours).toBeLessThan(long.cappedOfflineHours);
    expect(short.netIncome.amountMinorUnits).toBeGreaterThan(0);
  });
});
