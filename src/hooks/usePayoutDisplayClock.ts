import { useEffect, useRef, useState } from 'react';

import {
  displayAccruingCashMinor,
  PAYOUT_DISPLAY_INTERVAL_SECONDS,
} from '@/domain/economy/PayoutDisplay';

/** Shared clock for 10s payout display UI (progress bar, batched cash balances). */
export function usePayoutDisplayClock(): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return nowMs;
}

type FrozenCashState = {
  cycleKey: number;
  displayMinor: number;
};

/**
 * Cash balance frozen at each payout cycle boundary — avoids flicker from sub-second
 * accrued estimates vs one-second simulation ticks.
 */
export function useFrozenAccruingCashDisplay(
  actualCashMinor: number,
  hourlyAccrualMinor: number,
  nowMs: number,
): number {
  const stateRef = useRef<FrozenCashState | null>(null);

  if (hourlyAccrualMinor === 0) {
    return actualCashMinor;
  }

  const intervalMs = PAYOUT_DISPLAY_INTERVAL_SECONDS * 1000;
  const cycleKey = Math.floor(nowMs / intervalMs);

  if (stateRef.current === null) {
    stateRef.current = {
      cycleKey,
      displayMinor: displayAccruingCashMinor(actualCashMinor, hourlyAccrualMinor, nowMs),
    };
  }

  const state = stateRef.current;

  if (state.cycleKey !== cycleKey) {
    state.cycleKey = cycleKey;
    state.displayMinor = actualCashMinor;
  } else if (actualCashMinor < state.displayMinor) {
    state.displayMinor = actualCashMinor;
  }

  return state.displayMinor;
}

export function useDisplayedAccruingCash(
  actualCashMinor: number,
  hourlyAccrualMinor: number,
): number {
  const nowMs = usePayoutDisplayClock();
  return useFrozenAccruingCashDisplay(actualCashMinor, hourlyAccrualMinor, nowMs);
}
