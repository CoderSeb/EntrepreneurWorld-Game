import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { buildCompanyEconomyBreakdown } from '@/domain/economy/EconomyBreakdownService';
import { getRevenuePerHour, getExpensesPerHour } from '@/domain/economy/EffectiveEconomyCalculator';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

describe('EconomyBreakdownService', () => {
  it('matches net income from effective economy calculator', () => {
    const state = createAppState();
    state.companies.push({
      id: 'sub-1',
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
      employeeCount: 2,
      payrollLevel: 1,
      revenuePerHour: MoneyValue.fromMinor(120_000),
      expensesPerHour: MoneyValue.fromMinor(70_000),
      riskLevel: 0.2,
      upgradeTrackLevels: {},
      createdAtUnix: 0,
      updatedAtUnix: 0,
    });

    const company = state.companies[0];
    const expectedNet = getRevenuePerHour(company, config, state.marketState, state.companies, 1_000)
      .subtract(getExpensesPerHour(company, config, state.marketState, 1_000))
      .amountMinorUnits;
    const breakdown = buildCompanyEconomyBreakdown(
      company,
      config,
      state.marketState,
      state.companies,
      1_000,
    );

    expect(breakdown.netMinorPerHour).toBe(expectedNet);
  });
});
