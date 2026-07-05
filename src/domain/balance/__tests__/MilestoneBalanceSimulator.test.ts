import { simulateOnboardingMilestones } from '@/domain/balance/MilestoneBalanceSimulator';

describe('MilestoneBalanceSimulator', () => {
  it('runs passive onboarding simulation and reports milestone timing', () => {
    const report = simulateOnboardingMilestones(undefined, 60);
    expect(report.subsidiaryCreatedMinute).toBe(0);
    expect(typeof report.hourlyNetMinor).toBe('number');
    expect(report.elapsedMinutes).toBe(60);
  });
});
