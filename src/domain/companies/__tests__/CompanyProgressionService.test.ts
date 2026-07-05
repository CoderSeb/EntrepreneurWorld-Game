import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { applyCompanyIncomeForHours } from '@/domain/economy/CompanyIncomeService';
import { getActivityRevenueMultiplier } from '@/domain/companies/ActivityEffectService';
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
    automationPolicy: 'balanced' as const,
    executiveContracts: overrides.executiveContracts ?? {},
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

  it('applies automated task effects only while CEO contract is active', () => {
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

    expect(state.companies[0].activeEffects.length).toBeGreaterThan(0);
    const activeWindowRuns = countAutomatedActivityRuns(
      0,
      periodStartUnix,
      contractExpiryUnix,
      config.activities[0].cooldownSeconds,
    ).runCount;
    const fullWindowRuns = countAutomatedActivityRuns(
      0,
      periodStartUnix,
      nowUnix,
      config.activities[0].cooldownSeconds,
    ).runCount;
    expect(activeWindowRuns).toBeLessThan(fullWindowRuns);
  });

  it.each([8, 72])(
    'does not compound serve_customers activity boosts during %sh CEO automation',
    (hours) => {
      const serveActivity = config.activities.find((entry) => entry.id === 'serve_customers')!;
      const nowUnix = 200_000;
      const periodSeconds = hours * 3600;
      const state = createAppState();
      state.companies.push(
        createSubsidiary({
          executiveContracts: {
            ceo: { expiresAtUnix: nowUnix + 3600 },
          },
        }),
      );

      processCompanyProgression(state, config, periodSeconds, nowUnix);

      const company = state.companies[0];
      const serveEffects = company.activeEffects.filter(
        (effect) => effect.activityId === 'serve_customers',
      );

      expect(serveEffects.length).toBeLessThanOrEqual(1);
      const launchEffects = company.activeEffects.filter(
        (effect) => effect.activityId === 'launch_campaign',
      );
      expect(launchEffects.length).toBeLessThanOrEqual(2);
      for (const activityId of ['serve_customers', 'optimize_workflow'] as const) {
        const effects = company.activeEffects.filter((effect) => effect.activityId === activityId);
        expect(effects.length).toBeLessThanOrEqual(1);
      }
      if (serveEffects[0]) {
        expect(serveEffects[0].multiplier).toBe(serveActivity.effectMultiplier);
      }

      const expectedRevenueMultiplier = company.activeEffects
        .filter((effect) => effect.effectType === 'temporary_revenue_multiplier')
        .reduce((multiplier, effect) => multiplier * effect.multiplier, 1);
      expect(getActivityRevenueMultiplier(company, nowUnix)).toBeCloseTo(
        expectedRevenueMultiplier,
        5,
      );
    },
  );
});

describe('CompanyIncomeService lifetime profit', () => {
  it('does not mutate lifetime profit when applying cash income', () => {
    const state = createAppState();
    state.companies.push(createSubsidiary({ id: 'sub-income' }));

    applyCompanyIncomeForHours(state.companies, 1, config, state.marketState);
    expect(state.companies[0].lifetimeProfitMinor).toBe(0);
  });
});
