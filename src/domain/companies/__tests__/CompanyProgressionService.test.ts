import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { applyCompanyIncomeForHours } from '@/domain/economy/CompanyIncomeService';
import {
  buildAutomationPeriodSegments,
  countAutomatedActivityRuns,
  hasTaskAutomationActive,
  processCompanyProgression,
} from '@/domain/companies/CompanyProgressionService';
import { simulateTick } from '@/domain/economy/EconomySimulator';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

function createSubsidiary(overrides: Partial<{
  id: string;
  executiveContracts: Record<string, { expiresAtUnix: number }>;
}> = {}) {
  return {
    id: overrides.id ?? 'sub-1',
    name: 'Cafe AB',
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId: 'cafe',
    level: 1,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel: 0,
    executiveContracts: overrides.executiveContracts ?? {},
    lifetimeProfitMinor: 0,
    employeeCount: 2,
    payrollLevel: 1,
    revenuePerHour: MoneyValue.fromMinor(120_000),
    expensesPerHour: MoneyValue.fromMinor(70_000),
    riskLevel: 0.2,
    upgradeTrackLevels: {},
    createdAtUnix: 0,
    updatedAtUnix: 0,
  };
}

describe('CompanyProgressionService', () => {
  it('does not double-count lifetime profit when income and progression run together', () => {
    const state = createAppState();
    state.companies.push(createSubsidiary());

    simulateTick(state.player, state.companies, 3600, config, state.marketState);
    const afterIncome = state.companies[0].lifetimeProfitMinor;

    processCompanyProgression(state, config, 3600, 10_000);
    const afterProgression = state.companies[0].lifetimeProfitMinor;

    expect(afterIncome).toBe(0);
    expect(afterProgression).toBeGreaterThan(0);
    expect(afterProgression).toBeLessThan(60_000);
  });

  it('segments executive automation when a contract expires mid-period', () => {
    const nowUnix = 100_000;
    const periodSeconds = 7200;
    const periodStartUnix = nowUnix - periodSeconds;
    const company = createSubsidiary({
      executiveContracts: {
        ceo: { expiresAtUnix: nowUnix - 3600 },
      },
    });

    const segments = buildAutomationPeriodSegments(company, config, periodStartUnix, nowUnix);
    expect(segments).toHaveLength(2);
    expect(hasTaskAutomationActive(company, config, periodStartUnix)).toBe(true);
    expect(hasTaskAutomationActive(company, config, nowUnix - 1800)).toBe(false);

    const activeWindow = countAutomatedActivityRuns(0, periodStartUnix, nowUnix - 3600, 8);
    const fullWindow = countAutomatedActivityRuns(0, periodStartUnix, nowUnix, 8);
    expect(activeWindow.runCount).toBeLessThan(fullWindow.runCount);
  });

  it('applies automated task rewards only while CEO contract is active', () => {
    const nowUnix = 100_000;
    const periodSeconds = 7200;
    const periodStartUnix = nowUnix - periodSeconds;
    const contractExpiryUnix = nowUnix - 3600;
    const state = createAppState();
    state.companies.push(
      createSubsidiary({
        executiveContracts: {
          ceo: { expiresAtUnix: contractExpiryUnix },
        },
      }),
    );

    processCompanyProgression(state, config, periodSeconds, nowUnix);

    let expectedCash = 0;
    for (const activity of config.activities.filter((entry) => entry.appliesTo === 'subsidiary')) {
      const runs = countAutomatedActivityRuns(
        0,
        periodStartUnix,
        contractExpiryUnix,
        activity.cooldownSeconds,
      ).runCount;
      expectedCash += activity.rewardMinor * runs;
    }

    expect(state.companies[0].cashBalance.amountMinorUnits).toBe(expectedCash);
  });
});

describe('CompanyIncomeService lifetime profit', () => {
  it('does not mutate lifetime profit when applying cash income', () => {
    const state = createAppState();
    state.companies.push(createSubsidiary({ id: 'sub-income' }));

    applyCompanyIncomeForHours(state.companies, 1, config, state.marketState);
    expect(state.companies[0].lifetimeProfitMinor).toBe(0);
  });
});
