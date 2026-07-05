import {
  DEFAULT_BALANCE_GUARDRAILS,
  simulateAllBalanceScenarios,
  simulateBalanceScenario,
} from '@/domain/balance/BalanceScenarioSimulator';
import { simulateOnboardingMilestones } from '@/domain/balance/MilestoneBalanceSimulator';

describe('BalanceScenarioSimulator', () => {
  it.each([
    'passive_offline_1h',
    'passive_offline_8h',
    'passive_offline_72h',
    'engaged_active_no_ceo',
    'ceo_offline_8h',
    'ceo_offline_72h',
  ] as const)('scenario %s passes balance guardrails', (scenarioId) => {
    const report = simulateBalanceScenario(scenarioId);
    expect(report.warnings).toEqual([]);
    expect(report.hourlyNetMinor).toBeGreaterThan(0);
    expect(report.activityRevenueShare).toBeLessThanOrEqual(
      DEFAULT_BALANCE_GUARDRAILS.maxActivityRevenueShare,
    );
    expect(report.activityRevenueMultiplier).toBeLessThanOrEqual(
      DEFAULT_BALANCE_GUARDRAILS.maxCombinedActivityRevenueMultiplier,
    );
  });

  it('multi-industry portfolio reaches two subsidiaries with positive net', () => {
    const report = simulateBalanceScenario('multi_industry_portfolio');
    expect(report.warnings).toEqual([]);
    expect(report.subsidiaryCount).toBeGreaterThanOrEqual(2);
    expect(report.hourlyNetMinor).toBeGreaterThan(0);
  });

  it('all bundled scenarios pass together', () => {
    const reports = simulateAllBalanceScenarios();
    expect(reports).toHaveLength(7);
    for (const report of reports) {
      expect(report.warnings).toEqual([]);
    }
  });
});

describe('MilestoneBalanceSimulator', () => {
  it('hits onboarding milestone targets for an engaged café player', () => {
    const report = simulateOnboardingMilestones(undefined, 90);

    expect(report.warnings).toEqual([]);
    expect(report.hourlyNetMinor).toBeGreaterThan(0);
    expect(report.subsidiaryCreatedMinute).toBeGreaterThanOrEqual(1);
    expect(report.subsidiaryCreatedMinute).toBeLessThanOrEqual(3);
    expect(report.firstUpgradeMinute).toBeGreaterThanOrEqual(3);
    expect(report.firstUpgradeMinute).toBeLessThanOrEqual(7);
    expect(report.firstExecutiveMinute).toBeGreaterThanOrEqual(15);
    expect(report.firstExecutiveMinute).toBeLessThanOrEqual(30);
    expect(report.rank5Minute).toBeGreaterThanOrEqual(30);
    expect(report.rank5Minute).toBeLessThanOrEqual(60);
  });
});
