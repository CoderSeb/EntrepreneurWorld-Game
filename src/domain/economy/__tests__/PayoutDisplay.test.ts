import {
  accruedMinorInPayoutCycle,
  displayAccruingCashMinor,
  displayTreasuryMinor,
  netMinorPerPayoutCycle,
  PAYOUT_DISPLAY_INTERVAL_SECONDS,
  payoutCycleProgress,
} from '@/domain/economy/PayoutDisplay';

describe('PayoutDisplay', () => {
  it('scales hourly net to a 10 second payout preview', () => {
    expect(PAYOUT_DISPLAY_INTERVAL_SECONDS).toBe(10);
    expect(netMinorPerPayoutCycle(360_000)).toBe(1_000);
    expect(netMinorPerPayoutCycle(-360_000)).toBe(-1_000);
  });

  it('returns countdown within the display interval', () => {
    const atStart = payoutCycleProgress(0);
    expect(atStart.progress).toBe(0);
    expect(atStart.secondsRemaining).toBe(10);

    const nearEnd = payoutCycleProgress(9_500);
    expect(nearEnd.progress).toBeCloseTo(0.95, 2);
    expect(nearEnd.secondsRemaining).toBe(1);
  });

  it('keeps displayed treasury flat during a payout cycle', () => {
    const hourlyNetMinor = 360_000;
    const cycleStartTreasury = 1_600_000;
    const atCycleStart = displayAccruingCashMinor(cycleStartTreasury, hourlyNetMinor, 0);
    const midCycleActual = cycleStartTreasury + accruedMinorInPayoutCycle(hourlyNetMinor, 5_000);
    const midCycleDisplay = displayAccruingCashMinor(midCycleActual, hourlyNetMinor, 5_000);

    expect(atCycleStart).toBe(cycleStartTreasury);
    expect(midCycleDisplay).toBe(cycleStartTreasury);
    expect(displayTreasuryMinor(midCycleActual, hourlyNetMinor, 5_000)).toBe(cycleStartTreasury);
  });

  it('jumps displayed treasury when a payout cycle completes', () => {
    const hourlyNetMinor = 360_000;
    const cycleStartTreasury = 1_600_000;
    const payout = netMinorPerPayoutCycle(hourlyNetMinor);
    const afterPayoutActual = cycleStartTreasury + payout;
    const atNextCycleStart = displayAccruingCashMinor(afterPayoutActual, hourlyNetMinor, 10_000);

    expect(atNextCycleStart).toBe(afterPayoutActual);
    expect(atNextCycleStart).toBe(cycleStartTreasury + payout);
  });

  it('keeps the same displayed value within a whole simulation second', () => {
    const hourlyNetMinor = 360_000;
    const cycleStartTreasury = 1_600_000;
    const accruedAfterFiveSeconds = accruedMinorInPayoutCycle(hourlyNetMinor, 5_000);
    const actualAfterFiveSeconds = cycleStartTreasury + accruedAfterFiveSeconds;

    expect(displayAccruingCashMinor(actualAfterFiveSeconds, hourlyNetMinor, 5_500)).toBe(
      cycleStartTreasury,
    );
    expect(displayAccruingCashMinor(actualAfterFiveSeconds, hourlyNetMinor, 5_999)).toBe(
      cycleStartTreasury,
    );
  });
});
