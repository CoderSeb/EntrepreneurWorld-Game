import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { buildCompanyEconomyBreakdown } from '@/domain/economy/EconomyBreakdownService';
import { getRevenuePerHour, getExpensesPerHour } from '@/domain/economy/EffectiveEconomyCalculator';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

function sumBreakdownLines(
  breakdown: ReturnType<typeof buildCompanyEconomyBreakdown>,
  kind: 'revenue' | 'expense',
): number {
  return breakdown.lines
    .filter((line) => line.kind === kind)
    .reduce((sum, line) => sum + line.amountMinorPerHour, 0);
}

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
    expect(sumBreakdownLines(breakdown, 'revenue')).toBe(breakdown.grossRevenueMinorPerHour);
    expect(sumBreakdownLines(breakdown, 'expense')).toBe(breakdown.totalExpensesMinorPerHour);
    expect(breakdown.grossRevenueMinorPerHour - breakdown.totalExpensesMinorPerHour).toBe(
      breakdown.netMinorPerHour,
    );
  });

  it('keeps leverage industry lines aligned with effective revenue and net', () => {
    const company = {
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

    const expectedNet = getRevenuePerHour(company, config, {}, [], 1_000)
      .subtract(getExpensesPerHour(company, config, {}, 1_000))
      .amountMinorUnits;
    const breakdown = buildCompanyEconomyBreakdown(company, config, {}, [], 1_000);

    expect(breakdown.netMinorPerHour).toBe(expectedNet);
    expect(sumBreakdownLines(breakdown, 'revenue')).toBe(breakdown.grossRevenueMinorPerHour);
    expect(sumBreakdownLines(breakdown, 'expense')).toBe(breakdown.totalExpensesMinorPerHour);
    expect(breakdown.grossRevenueMinorPerHour - breakdown.totalExpensesMinorPerHour).toBe(
      breakdown.netMinorPerHour,
    );
    expect(breakdown.lines.some((line) => line.id === 'vacancy_revenue')).toBe(true);
    expect(breakdown.lines.some((line) => line.id === 'leverage_revenue')).toBe(true);
  });
});
