/** Visual payout cycle in the header — simulation still runs every second. */
export const PAYOUT_DISPLAY_INTERVAL_SECONDS = 10;

/** Matches one-second simulation ticks (MoneyValue.multiplyScalar per tick). */
export function minorPerSimulationSecond(hourlyNetMinor: number): number {
  return Math.round(hourlyNetMinor / 3600);
}

export function netMinorPerPayoutCycle(hourlyNetMinor: number): number {
  return minorPerSimulationSecond(hourlyNetMinor) * PAYOUT_DISPLAY_INTERVAL_SECONDS;
}

export function payoutCycleProgress(nowMs: number): {
  progress: number;
  secondsRemaining: number;
} {
  const intervalMs = PAYOUT_DISPLAY_INTERVAL_SECONDS * 1000;
  const elapsedInCycle = nowMs % intervalMs;
  const progress = elapsedInCycle / intervalMs;
  const secondsRemaining = Math.max(1, Math.ceil((intervalMs - elapsedInCycle) / 1000));
  return { progress, secondsRemaining };
}

/** Passive income accrued since the current payout cycle started (aligned to whole sim seconds). */
export function accruedMinorInPayoutCycle(hourlyNetMinor: number, nowMs: number): number {
  const intervalMs = PAYOUT_DISPLAY_INTERVAL_SECONDS * 1000;
  const elapsedWholeSeconds = Math.floor((nowMs % intervalMs) / 1000);
  return minorPerSimulationSecond(hourlyNetMinor) * elapsedWholeSeconds;
}

/** Estimates cycle-start cash from current actual (for mid-cycle mount). Used by header Treasury only. */
export function displayAccruingCashMinor(
  actualCashMinor: number,
  hourlyAccrualMinor: number,
  nowMs: number,
): number {
  if (hourlyAccrualMinor === 0) {
    return actualCashMinor;
  }
  return actualCashMinor - accruedMinorInPayoutCycle(hourlyAccrualMinor, nowMs);
}

/** @deprecated Use displayAccruingCashMinor */
export function displayTreasuryMinor(
  actualTreasuryMinor: number,
  hourlyNetMinor: number,
  nowMs: number,
): number {
  return displayAccruingCashMinor(actualTreasuryMinor, hourlyNetMinor, nowMs);
}
