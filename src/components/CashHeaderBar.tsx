import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { useTranslation } from '@/i18n';
import { interpolate } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const TICK_MS = 1000;

export function CashHeaderBar() {
  const { dashboard, formatMoneyCompact, lastSimTickMs, backendStatus } = useGame();
  const { t } = useTranslation();
  const [tickProgress, setTickProgress] = useState(0);

  const netPerSecondMinor = Math.round(dashboard.hourlyNet.amountMinorUnits / 3600);
  const secondsToNext = Math.max(0, Math.ceil((1 - tickProgress) * TICK_MS / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastSimTickMs;
      setTickProgress(Math.min(1, elapsed / TICK_MS));
    }, 100);
    return () => clearInterval(interval);
  }, [lastSimTickMs]);

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {backendStatus.enabled && !backendStatus.connected ? (
          <Text style={styles.offline}>{t.header.backendOffline}</Text>
        ) : null}
        <Text style={styles.tickLabel}>{t.header.nextPayout}</Text>
        <View style={styles.tickTrack}>
          <View style={[styles.tickFill, { width: `${Math.round(tickProgress * 100)}%` }]} />
        </View>
        <Text style={styles.tickMeta}>
          {interpolate(t.header.nextPayoutMeta, { seconds: secondsToNext })}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.cashLabel}>{t.common.cash}</Text>
        <Text style={styles.cashValue}>{formatMoneyCompact(dashboard.playerCash.amountMinorUnits)}</Text>
        {netPerSecondMinor !== 0 ? (
          <Text style={[styles.flowMeta, netPerSecondMinor > 0 ? styles.positive : styles.negative]}>
            {netPerSecondMinor > 0 ? '+' : ''}
            {formatMoneyCompact(netPerSecondMinor)}
            {t.header.perSecond}
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
  cashLabel: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted, letterSpacing: 1 },
  cashValue: { fontFamily: fonts.display, fontSize: fontSizes.xl, color: colors.primary, fontWeight: '900' },
  flowMeta: { fontFamily: fonts.mono, fontSize: fontSizes.micro },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  offline: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.warning },
  tickLabel: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted, letterSpacing: 0.5 },
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
