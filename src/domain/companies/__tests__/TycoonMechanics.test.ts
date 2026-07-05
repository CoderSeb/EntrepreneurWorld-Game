import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import {
  applyActivityEffect,
  getActivityRevenueMultiplier,
} from '@/domain/companies/ActivityEffectService';
import { getRevenuePerHour } from '@/domain/economy/EffectiveEconomyCalculator';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

describe('ActivityEffectService', () => {
  it('applies temporary revenue boost instead of large cash rewards', () => {
    const activity = config.activities.find((entry) => entry.id === 'launch_campaign')!;
    const company = {
      id: 'sub-1',
      companyKind: CompanyKinds.SUBSIDIARY,
      industryId: 'cafe',
      level: 1,
      cashBalance: MoneyValue.zero(),
      reputation: 0,
      automationLevel: 0,
      executiveContracts: {},
      activeEffects: [],
      lifetimeProfitMinor: 0,
      employeeCount: 2,
      payrollLevel: 1,
      revenuePerHour: MoneyValue.fromMinor(120_000),
      expensesPerHour: MoneyValue.fromMinor(70_000),
      riskLevel: 0.2,
      upgradeTrackLevels: {},
      createdAtUnix: 0,
      updatedAtUnix: 0,
      name: 'Cafe',
    };

    const beforeCash = company.cashBalance.amountMinorUnits;
    const result = applyActivityEffect(company, activity, 1_000);
    expect(result.success).toBe(true);
    expect(result.effectApplied).toBe(true);
    expect(company.cashBalance.amountMinorUnits).toBe(beforeCash);
    expect(getActivityRevenueMultiplier(company, 1_000)).toBeGreaterThan(1);
  });
});

describe('Industry mechanics in effective economy', () => {
  it('caps cafe revenue by staffing capacity', () => {
    const state = createAppState();
    state.companies.push({
      id: 'cafe-1',
      name: 'Cafe',
      companyKind: CompanyKinds.SUBSIDIARY,
      industryId: 'cafe',
      level: 1,
      cashBalance: MoneyValue.zero(),
      reputation: 0,
      automationLevel: 0,
      executiveContracts: {},
      activeEffects: [],
      lifetimeProfitMinor: 0,
      employeeCount: 1,
      payrollLevel: 1,
      revenuePerHour: MoneyValue.fromMinor(500_000),
      expensesPerHour: MoneyValue.fromMinor(70_000),
      riskLevel: 0.2,
      upgradeTrackLevels: {},
      createdAtUnix: 0,
      updatedAtUnix: 0,
    });

    const revenue = getRevenuePerHour(
      state.companies[0],
      config,
      state.marketState,
      state.companies,
      1_000,
    );
    expect(revenue.amountMinorUnits).toBeLessThanOrEqual(65_000);
  });
});
