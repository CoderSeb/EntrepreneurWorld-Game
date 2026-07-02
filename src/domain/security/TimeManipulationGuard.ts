/** Max wall-clock gap treated as a single offline period before capping (anti time-warp). */
export const MAX_WALL_CLOCK_GAP_SECONDS = 60 * 60 * 24 * 45;

/** Allow small negative jumps from clock skew or DST without punishing the player. */
export const CLOCK_SKEW_TOLERANCE_SECONDS = 300;

export type OfflineDurationGuardResult = {
  offlineSeconds: number;
  suspicious: boolean;
  reason: string | null;
};

/**
 * Derive offline seconds from timestamps with basic manipulation detection.
 * Caps reward duration using economy config max offline hours.
 */
export function guardOfflineDuration(
  lastSeenAtUnix: number,
  nowUnix: number,
  maxOfflineHoursRewarded: number,
): OfflineDurationGuardResult {
  const rawSeconds = nowUnix - lastSeenAtUnix;

  if (rawSeconds < -CLOCK_SKEW_TOLERANCE_SECONDS) {
    return {
      offlineSeconds: 0,
      suspicious: true,
      reason: 'clock_moved_backwards',
    };
  }

  const normalized = Math.max(0, rawSeconds);
  const rewardCapSeconds = Math.max(0, maxOfflineHoursRewarded) * 3600;

  if (normalized > MAX_WALL_CLOCK_GAP_SECONDS) {
    return {
      offlineSeconds: rewardCapSeconds,
      suspicious: true,
      reason: 'wall_clock_gap_capped',
    };
  }

  if (normalized > rewardCapSeconds) {
    return {
      offlineSeconds: rewardCapSeconds,
      suspicious: false,
      reason: 'offline_reward_capped',
    };
  }

  return {
    offlineSeconds: normalized,
    suspicious: false,
    reason: null,
  };
}
