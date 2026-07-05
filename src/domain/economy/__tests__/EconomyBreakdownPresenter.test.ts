import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { buildCompanyEconomyBreakdown } from '@/domain/economy/EconomyBreakdownService';
import { presentRealisticEconomyBreakdown } from '@/domain/economy/EconomyBreakdownPresenter';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

function sumPresented(
  lines: { amountMinorPerHour: number; isCredit?: boolean }[],
): number {
  return lines.reduce(
    (sum, line) => sum + (line.isCredit ? -line.amountMinorPerHour : line.amountMinorPerHour),
    0,
  );
}

describe('EconomyBreakdownPresenter', () => {
  it('aggregates internal lines into realistic categories without changing totals', () => {
    const state = createAppState();
    const nowUnix = 1_000;
    state.companies.push({
      id: 'cafe-1',
      name: 'Cafe',
      companyKind: CompanyKinds.SUBSIDIARY,
      industryId: 'cafe',
      level: 5,
      cashBalance: MoneyValue.zero(),
      reputation: 0,
      automationLevel: 2,
      automationPolicy: 'balanced' as const,
      executiveContracts: {
        ceo: { expiresAtUnix: 9_999 },
        cfo: { expiresAtUnix: 9_999 },
        cmo: { expiresAtUnix: 9_999 },
      },
      activeEffects: [],
      integrationDebtMinor: 0,
      integrationComplete: true,
      lifetimeProfitMinor: 0,
      employeeCount: 4,
      payrollLevel: 2,
      revenuePerHour: MoneyValue.fromMinor(200_000),
      expensesPerHour: MoneyValue.fromMinor(53_500),
      riskLevel: 0.2,
      upgradeTrackLevels: { marketing: 2 },
      createdAtUnix: 0,
      updatedAtUnix: 0,
    });

    const company = state.companies[0];
    const breakdown = buildCompanyEconomyBreakdown(
      company,
      config,
      state.marketState,
      state.companies,
      nowUnix,
    );
    const presented = presentRealisticEconomyBreakdown(breakdown, (id) => id);

    expect(presented.revenueLines.some((line) => line.id === 'operating_sales')).toBe(true);
    expect(presented.revenueLines.some((line) => line.id.startsWith('executive_revenue_'))).toBe(
      false,
    );
    expect(presented.revenueLines.some((line) => line.id === 'leadership_impact')).toBe(true);
    expect(presented.expenseLines.some((line) => line.id === 'staff_salaries')).toBe(true);
    expect(presented.expenseLines.some((line) => line.id.startsWith('executive_salary_'))).toBe(
      false,
    );
    expect(presented.expenseLines.some((line) => line.id === 'executive_compensation')).toBe(true);

    expect(sumPresented(presented.revenueLines)).toBe(breakdown.grossRevenueMinorPerHour);
    expect(sumPresented(presented.expenseLines)).toBe(breakdown.totalExpensesMinorPerHour);
    expect(presented.netMinorPerHour).toBe(breakdown.netMinorPerHour);
  });
});
