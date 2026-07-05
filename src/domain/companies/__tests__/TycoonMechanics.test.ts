import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { CompanyState } from '@/domain/core/CompanyState';
import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { performActivity } from '@/domain/companies/CompanyService';
import { calculateActivityInstantCashMinor } from '@/domain/companies/ActivityRewardService';
import {
  applyActivityEffect,
  describeActivityEffect,
  getActivityExpenseMultiplier,
  getActivityRevenueMultiplier,
} from '@/domain/companies/ActivityEffectService';
import { getExpensesPerHour, getRevenuePerHour } from '@/domain/economy/EffectiveEconomyCalculator';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

describe('ActivityEffectService', () => {
  const serveActivity = config.activities.find((entry) => entry.id === 'serve_customers')!;
  const launchActivity = config.activities.find((entry) => entry.id === 'launch_campaign')!;

  function createCafeCompany(): CompanyState {
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

  it('describes configured boost durations from economy config', () => {
    expect(describeActivityEffect(serveActivity)).toContain('15m');
    expect(describeActivityEffect(serveActivity)).toContain('+10% rev');
    expect(describeActivityEffect(launchActivity)).toContain('1h');
    expect(describeActivityEffect(launchActivity)).toContain('+8% rev');
    expect(describeActivityEffect(launchActivity)).toContain('-8% exp');
  });

  it('applies temporary revenue boost instead of large cash rewards', () => {
    const company = createCafeCompany();

    const beforeCash = company.cashBalance.amountMinorUnits;
    const result = applyActivityEffect(company, launchActivity, 1_000, { instantCashMinor: 0 });
    expect(result.success).toBe(true);
    expect(result.effectApplied).toBe(true);
    expect(company.cashBalance.amountMinorUnits).toBe(beforeCash);
    expect(getActivityRevenueMultiplier(company, 1_000)).toBeGreaterThan(1);
    expect(getActivityExpenseMultiplier(company, 1_000)).toBeLessThan(1);
  });

  it('does not re-apply the same activity while its boost is active', () => {
    const company = createCafeCompany();

    applyActivityEffect(company, serveActivity, 1_000, { instantCashMinor: 0 });
    applyActivityEffect(company, serveActivity, 1_100, { instantCashMinor: 0 });
    applyActivityEffect(company, serveActivity, 1_200, { instantCashMinor: 0 });

    expect(company.activeEffects).toHaveLength(1);
    expect(company.activeEffects[0]?.expiresAtUnix).toBe(1_000 + serveActivity.durationSeconds);
    expect(getActivityRevenueMultiplier(company, 1_200)).toBe(serveActivity.effectMultiplier);
  });

  it('blocks performActivity while the boost is still active', () => {
    const company = createCafeCompany();
    const state = createAppState();
    state.companies.push(company);

    const first = performActivity(state, config, company, serveActivity, 1_000);
    expect(first.success).toBe(true);

    const blocked = performActivity(state, config, company, serveActivity, 1_100);
    expect(blocked.success).toBe(false);
    if (!blocked.success) {
      expect(blocked.errorCode).toBe('activity_on_cooldown');
    }
  });

  it('grants instant cash based on company revenue minutes', () => {
    const company = createCafeCompany();
    const state = createAppState();
    state.companies.push(company);

    const expectedCash = calculateActivityInstantCashMinor(
      serveActivity,
      company,
      config,
      state.marketState,
      state.companies,
      1_000,
    );
    expect(expectedCash).toBeGreaterThan(0);

    const beforeCash = company.cashBalance.amountMinorUnits;
    const result = performActivity(state, config, company, serveActivity, 1_000);
    expect(result.success).toBe(true);
    expect(company.cashBalance.amountMinorUnits - beforeCash).toBe(expectedCash);
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
