import { countAutomatedActivityRuns } from '@/domain/companies/CompanyProgressionService';

describe('countAutomatedActivityRuns', () => {
  it('counts repeated runs across an offline window', () => {
    const result = countAutomatedActivityRuns(0, 0, 100, 8);
    expect(result.runCount).toBe(13);
    expect(result.nextReadyAtUnix).toBe(104);
  });

  it('respects an active cooldown at period start', () => {
    const result = countAutomatedActivityRuns(50, 0, 100, 8);
    expect(result.runCount).toBe(7);
    expect(result.nextReadyAtUnix).toBe(106);
  });

  it('returns zero when still cooling down at period end', () => {
    const result = countAutomatedActivityRuns(200, 0, 100, 8);
    expect(result.runCount).toBe(0);
    expect(result.nextReadyAtUnix).toBe(200);
  });
});
