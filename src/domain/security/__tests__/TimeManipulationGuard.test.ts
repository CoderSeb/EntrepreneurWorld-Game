import {
  guardOfflineDuration,
  MAX_WALL_CLOCK_GAP_SECONDS,
} from '@/domain/security/TimeManipulationGuard';

describe('TimeManipulationGuard', () => {
  it('returns zero offline when clock moved backwards beyond tolerance', () => {
    const result = guardOfflineDuration(10_000, 9_000, 720);
    expect(result.offlineSeconds).toBe(0);
    expect(result.suspicious).toBe(true);
    expect(result.reason).toBe('clock_moved_backwards');
  });

  it('allows small clock skew within tolerance', () => {
    const result = guardOfflineDuration(10_000, 9_800, 720);
    expect(result.offlineSeconds).toBe(0);
    expect(result.suspicious).toBe(false);
  });

  it('caps offline reward at config max hours', () => {
    const result = guardOfflineDuration(0, 3_000_000, 720);
    expect(result.offlineSeconds).toBe(720 * 3600);
    expect(result.reason).toBe('offline_reward_capped');
  });

  it('caps extreme wall-clock gaps as suspicious', () => {
    const now = 1_000_000;
    const lastSeen = now - MAX_WALL_CLOCK_GAP_SECONDS - 10_000;
    const result = guardOfflineDuration(lastSeen, now, 720);
    expect(result.offlineSeconds).toBe(720 * 3600);
    expect(result.suspicious).toBe(true);
    expect(result.reason).toBe('wall_clock_gap_capped');
  });
});
