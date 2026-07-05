import { simulateOnboardingMilestones } from '@/domain/balance/MilestoneBalanceSimulator';

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
