import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { Screen } from '@/components/Screen';
import { GlowBadge } from '@/components/GlowBadge';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function MarketScreen() {
  const { companies, market, dashboard, formatMoneyCompact } = useGame();
  const conglomerateLabel = dashboard.conglomerateName.trim();

  return (
    <Screen
      header={
        <View>
          <Text style={styles.headerTitle}>Market intelligence</Text>
          <Text style={styles.headerMeta}>
            {conglomerateLabel ? `${conglomerateLabel} · ` : ''}Live sector performance and global events
          </Text>
        </View>
      }>
      <SectionHeader title="Your companies" subtitle={`${companies.length} portfolio companies`} />
      {companies.length === 0 ? (
        <EmptyState title="No listings" message="Found a company in CORPS to appear here." />
      ) : (
        companies.map((c) => (
          <View key={c.id} style={[styles.row, { borderColor: `${c.sectorColor}18` }]}>
            <View style={styles.rowBody}>
              <Text style={[styles.companyName, { color: c.sectorColor }]} numberOfLines={2}>
                {c.name}
              </Text>
              <Text style={styles.industry}>{c.industryLabel}</Text>
              <Text style={styles.revenue}>{formatMoneyCompact(c.revenueMinor)}/hr</Text>
            </View>
            <Text style={[styles.delta, { color: c.growth >= 0 ? colors.success : colors.danger }]}>
              {c.growth >= 0 ? '+' : ''}
              {c.growth.toFixed(1)}%
            </Text>
          </View>
        ))
      )}

      <SectionHeader title="Active events" subtitle={`${market.events.length} modifiers running`} />
      {market.events.length === 0 ? (
        <EmptyState title="Calm markets" message="No active events — check back after your next session." />
      ) : (
        market.events.map((event) => {
          const bullish = event.revenueMultiplier >= 1;
          const tag = event.global ? 'GLOBAL' : 'SECTOR';
          const color = bullish ? colors.primary : colors.danger;
          return (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.time}>{event.remainingHours.toFixed(0)}h</Text>
              <View style={styles.eventBody}>
                <Text style={styles.headline}>{event.displayName}</Text>
                <Text style={styles.eventMeta}>
                  Rev ×{event.revenueMultiplier.toFixed(2)} · Exp ×{event.expenseMultiplier.toFixed(2)}
                </Text>
              </View>
              <GlowBadge label={tag} color={color} />
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontFamily: fonts.display, fontSize: fontSizes.xl, color: colors.primary, fontWeight: '900' },
  headerMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 4 },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowBody: { flex: 1, flexShrink: 1 },
  companyName: { fontFamily: fonts.display, fontSize: fontSizes.lg, fontWeight: '700' },
  industry: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 2 },
  revenue: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  delta: { fontFamily: fonts.mono, fontSize: fontSizes.lg, fontWeight: '700' },
  eventRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.primary}0a`,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, minWidth: 32 },
  eventBody: { flex: 1 },
  headline: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md, color: colors.textSecondary, lineHeight: 18 },
  eventMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 4 },
});
