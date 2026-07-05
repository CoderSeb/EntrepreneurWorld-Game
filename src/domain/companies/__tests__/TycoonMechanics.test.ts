import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import {
  applyActivityEffect,
  getActivityRevenueMultiplier,
} from '@/domain/companies/ActivityEffectService';
import { getRevenuePerHour, getExpensesPerHour } from '@/domain/economy/EffectiveEconomyCalculator';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

describe('ActivityEffectService', () => {
  const serveActivity = config.activities.find((entry) => entry.id === 'serve_customers')!;

  function createCafeCompany() {
    return {
      id: 'sub-1',
      companyKind: CompanyKinds.SUBSIDIARY,
      industryId: 'cafe',
      level: 1,
      cashBalance: MoneyValue.zero(),
      reputation: 0,
      automationLevel: 0,
      automationPolicy: 'balanced' as const,
      executiveContracts: {},
      activeEffects: [],
      integrationDebtMinor: 0,
      integrationComplete: true,
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
  }

  it('applies temporary revenue boost instead of large cash rewards', () => {
    const activity = config.activities.find((entry) => entry.id === 'launch_campaign')!;
    const company = createCafeCompany();

    const beforeCash = company.cashBalance.amountMinorUnits;
    const result = applyActivityEffect(company, activity, 1_000);
    expect(result.success).toBe(true);
    expect(result.effectApplied).toBe(true);
    expect(company.cashBalance.amountMinorUnits).toBe(beforeCash);
    expect(getActivityRevenueMultiplier(company, 1_000)).toBeGreaterThan(1);
  });

  it('refreshes the same activity instead of stacking duplicate effects', () => {
    const company = createCafeCompany();

    for (let run = 0; run < 8; run += 1) {
      applyActivityEffect(company, serveActivity, 1_000 + run * 60);
    }

    expect(company.activeEffects).toHaveLength(1);
    expect(getActivityRevenueMultiplier(company, 1_500)).toBe(serveActivity.effectMultiplier);
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
    automationPolicy: 'balanced' as const,
      executiveContracts: {},
      activeEffects: [],
    integrationDebtMinor: 0,
    integrationComplete: true,
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
    expect(revenue.amountMinorUnits).toBeLessThanOrEqual(130_000);
  });

  it('applies real estate vacancy and leverage interest from expansion track', () => {
    const withExpansion = {
      id: 're-1',
      name: 'Properties',
      companyKind: CompanyKinds.SUBSIDIARY,
      industryId: 'real_estate',
      level: 3,
      cashBalance: MoneyValue.zero(),
      reputation: 0,
      automationLevel: 0,
      automationPolicy: 'balanced' as const,
      executiveContracts: {},
      activeEffects: [],
      integrationDebtMinor: 0,
      integrationComplete: true,
      lifetimeProfitMinor: 0,
      employeeCount: 0,
      payrollLevel: 1,
      revenuePerHour: MoneyValue.fromMinor(145_000),
      expensesPerHour: MoneyValue.fromMinor(60_000),
      riskLevel: 0.15,
      upgradeTrackLevels: { expansion: 2 },
      createdAtUnix: 0,
      updatedAtUnix: 0,
    };
    const withoutExpansion = { ...withExpansion, upgradeTrackLevels: {} };

    const expandedRevenue = getRevenuePerHour(withExpansion, config, {}, [], 1_000).amountMinorUnits;
    const baseRevenue = getRevenuePerHour(withoutExpansion, config, {}, [], 1_000).amountMinorUnits;
    expect(expandedRevenue).toBeGreaterThan(baseRevenue);

    const expenses = getExpensesPerHour(withExpansion, config, {}, 1_000).amountMinorUnits;
    expect(expenses).toBeGreaterThan(60_000);
  });
});
