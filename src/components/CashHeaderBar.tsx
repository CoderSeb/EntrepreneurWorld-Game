import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { useTranslation } from '@/i18n';
import { interpolate } from '@/i18n';
import {
  netMinorPerPayoutCycle,
  PAYOUT_DISPLAY_INTERVAL_SECONDS,
  payoutCycleProgress,
} from '@/domain/economy/PayoutDisplay';
import { useFrozenAccruingCashDisplay, usePayoutDisplayClock } from '@/hooks/usePayoutDisplayClock';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export function CashHeaderBar() {
  const { dashboard, formatMoney, cloudSync } = useGame();
  const { t } = useTranslation();
  const nowMs = usePayoutDisplayClock();

  const hourlyNetMinor = dashboard.hourlyNet.amountMinorUnits;
  const payoutPerCycleMinor = netMinorPerPayoutCycle(hourlyNetMinor);
  const hasPayoutPreview = hourlyNetMinor !== 0;
  const cycleState = payoutCycleProgress(nowMs);
  const displayedTreasuryMinor = useFrozenAccruingCashDisplay(
    dashboard.conglomerateLiquidCash.amountMinorUnits,
    hourlyNetMinor,
    nowMs,
  );

  const payoutPositive = payoutPerCycleMinor >= 0;

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {cloudSync.status === 'offline' ? (
          <Text style={styles.offline}>{t.header.backendOffline}</Text>
        ) : cloudSync.status === 'pending' ? (
          <Text style={styles.offline}>{t.header.cloudSyncPending}</Text>
        ) : null}
        <View style={styles.payoutHeaderRow}>
          <Text style={styles.tickLabel}>{t.header.nextPayout}</Text>
          <Text style={styles.intervalMeta}>
            {interpolate(t.header.payoutInterval, { seconds: PAYOUT_DISPLAY_INTERVAL_SECONDS })}
          </Text>
        </View>
        {hasPayoutPreview ? (
          <Text style={[styles.payoutAmount, payoutPositive ? styles.positive : styles.negative]}>
            {interpolate(t.header.nextPayoutAmount, {
              amount: `${payoutPositive ? '+' : ''}${formatMoney(payoutPerCycleMinor)}`,
            })}
          </Text>
        ) : null}
        <View style={styles.tickTrack}>
          <View style={[styles.tickFill, { width: `${Math.round(cycleState.progress * 100)}%` }]} />
        </View>
        <Text style={styles.tickMeta}>
          {interpolate(t.header.nextPayoutCountdown, { seconds: cycleState.secondsRemaining })}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.cashLabel}>{t.common.treasury}</Text>
        <Text style={styles.cashValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(displayedTreasuryMinor)}
        </Text>
        {hasPayoutPreview ? (
          <Text style={[styles.flowMeta, payoutPositive ? styles.positive : styles.negative]}>
            {hourlyNetMinor > 0 ? '+' : ''}
            {formatMoney(hourlyNetMinor)}
            {t.header.perHour}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.primary}12`,
    backgroundColor: '#0d1a2e',
  },
  left: { flex: 1, gap: 4 },
  right: { alignItems: 'flex-end', gap: 2 },
  payoutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cashLabel: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted, letterSpacing: 1 },
  cashValue: { fontFamily: fonts.display, fontSize: fontSizes.xl, color: colors.primary, fontWeight: '900' },
  flowMeta: { fontFamily: fonts.mono, fontSize: fontSizes.micro },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  offline: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.warning },
  tickLabel: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted, letterSpacing: 0.5 },
  intervalMeta: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted },
  payoutAmount: {
    fontFamily: fonts.display,
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  tickTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: `${colors.primary}18`,
    overflow: 'hidden',
  },
  tickFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  tickMeta: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted },
});
