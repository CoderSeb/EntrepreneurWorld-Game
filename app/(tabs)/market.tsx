import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { Screen } from '@/components/Screen';
import { GlowBadge } from '@/components/GlowBadge';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { LeaderboardSection } from '@/components/LeaderboardSection';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getMarketEventLabel, getMarketSignalLabel } from '@/i18n/configLabels';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function MarketScreen() {
  const {
    companies,
    market,
    acquisitions,
    dashboard,
    completeAcquisition,
    formatMoneyCompact,
    availableFoundingCashMinor,
  } = useGame();
  const { t } = useTranslation();
  const conglomerateLabel = dashboard.conglomerateName.trim();
  const [acquiringId, setAcquiringId] = useState<string | null>(null);
  const [acquisitionName, setAcquisitionName] = useState('');

  const handleAcquire = (targetId: string, costMinor: number) => {
    const trimmed = acquisitionName.trim();
    if (trimmed.length < 2) {
      Alert.alert(t.market.acquisitionsTitle, t.foundCompany.needCompanyName);
      return;
    }
    if (availableFoundingCashMinor < costMinor) {
      Alert.alert(t.market.acquisitionsTitle, t.company.insufficientCash);
      return;
    }
    const result = completeAcquisition(targetId, trimmed);
    if (!result.success) {
      Alert.alert(t.market.acquisitionsTitle, result.errorMessage);
      return;
    }
    setAcquiringId(null);
    setAcquisitionName('');
  };

  return (
    <Screen
      header={
        <View>
          <Text style={styles.headerTitle}>{t.market.title}</Text>
          <Text style={styles.headerMeta}>
            {conglomerateLabel
              ? interpolate(t.market.headerMetaWithConglomerate, { name: conglomerateLabel })
              : t.market.headerMetaDefault}
          </Text>
        </View>
      }>
      <LeaderboardSection />

      <SectionHeader
        title={t.market.marketSignals}
        subtitle={interpolate(t.market.marketSignalsSubtitle, { count: market.signals.length })}
      />
      {market.signals.length === 0 ? (
        <EmptyState title={t.market.calmSignalsTitle} message={t.market.calmSignalsMessage} />
      ) : (
        market.signals.map((signal) => {
          const bullish = signal.expectedRevenueMultiplier >= 1;
          const tag = signal.global ? t.common.global : t.common.sector;
          const color = bullish ? colors.primary : colors.danger;
          return (
            <View key={signal.id} style={styles.eventRow}>
              <Text style={styles.time}>
                {interpolate(t.market.hoursShort, { hours: signal.hoursUntilEvent.toFixed(0) })}
              </Text>
              <View style={styles.eventBody}>
                <Text style={styles.headline}>{getMarketSignalLabel(signal.id, t)}</Text>
                <Text style={styles.eventMeta}>
                  {interpolate(t.market.signalMeta, {
                    hours: signal.hoursUntilEvent.toFixed(0),
                    revenue: signal.expectedRevenueMultiplier.toFixed(2),
                    expense: signal.expectedExpenseMultiplier.toFixed(2),
                  })}
                </Text>
              </View>
              <GlowBadge label={tag} color={color} />
            </View>
          );
        })
      )}

      <SectionHeader
        title={t.market.yourCompanies}
        subtitle={interpolate(t.market.yourCompaniesSubtitle, { count: companies.length })}
      />
      {companies.length === 0 ? (
        <EmptyState title={t.market.noListingsTitle} message={t.market.noListingsMessage} />
      ) : (
        companies.map((c) => (
          <View key={c.id} style={[styles.row, { borderColor: `${c.sectorColor}18` }]}>
            <View style={styles.rowBody}>
              <Text style={[styles.companyName, { color: c.sectorColor }]} numberOfLines={2}>
                {c.name}
              </Text>
              <Text style={styles.industry}>{c.industryLabel}</Text>
              <Text style={styles.revenue}>
                {formatMoneyCompact(c.revenueMinor)}
                {t.common.perHour}
              </Text>
            </View>
            <Text style={[styles.delta, { color: c.growth >= 0 ? colors.success : colors.danger }]}>
              {c.growth >= 0 ? '+' : ''}
              {c.growth.toFixed(1)}%
            </Text>
          </View>
        ))
      )}

      <SectionHeader
        title={t.market.activeEvents}
        subtitle={interpolate(t.market.activeEventsSubtitle, { count: market.events.length })}
      />
      {market.events.length === 0 ? (
        <EmptyState title={t.market.calmMarketsTitle} message={t.market.calmMarketsMessage} />
      ) : (
        market.events.map((event) => {
          const bullish = event.revenueMultiplier >= 1;
          const tag = event.global ? t.common.global : t.common.sector;
          const color = bullish ? colors.primary : colors.danger;
          return (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.time}>
                {interpolate(t.market.hoursShort, { hours: event.remainingHours.toFixed(0) })}
              </Text>
              <View style={styles.eventBody}>
                <Text style={styles.headline}>{getMarketEventLabel(event.id, t)}</Text>
                <Text style={styles.eventMeta}>
                  {interpolate(t.market.eventMeta, {
                    revenue: event.revenueMultiplier.toFixed(2),
                    expense: event.expenseMultiplier.toFixed(2),
                  })}
                </Text>
              </View>
              <GlowBadge label={tag} color={color} />
            </View>
          );
        })
      )}

      <SectionHeader
        title={t.market.acquisitionsTitle}
        subtitle={interpolate(t.market.acquisitionsSubtitle, {
          count: acquisitions.filter((target) => target.unlocked).length,
        })}
      />
      {acquisitions.length === 0 ? (
        <EmptyState title={t.market.noListingsTitle} message={t.market.calmMarketsMessage} />
      ) : (
        acquisitions.map((target) => (
          <View key={target.id} style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.companyName}>{target.displayName}</Text>
              <Text style={styles.eventMeta}>
                {interpolate(t.market.acquisitionMeta, {
                  cost: formatMoneyCompact(target.costMinor),
                  boost: formatMoneyCompact(target.revenueBoostPerHourMinor),
                  debt: formatMoneyCompact(target.integrationDebtMinor),
                })}
              </Text>
              {!target.unlocked ? (
                <Text style={styles.warning}>
                  {interpolate(t.market.acquisitionLocked, { rank: target.minBusinessRank })}
                </Text>
              ) : null}
            </View>
            {target.unlocked ? (
              acquiringId === target.id ? (
                <View style={styles.acquireForm}>
                  <TextInput
                    value={acquisitionName}
                    onChangeText={setAcquisitionName}
                    placeholder={t.foundCompany.formTitle}
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                  <PrimaryButton
                    label={t.market.acquisitionAction}
                    onPress={() => handleAcquire(target.id, target.costMinor)}
                  />
                  <Pressable onPress={() => setAcquiringId(null)}>
                    <Text style={styles.cancel}>{t.common.back}</Text>
                  </Pressable>
                </View>
              ) : (
                <PrimaryButton
                  label={t.market.acquisitionAction}
                  onPress={() => {
                    setAcquiringId(target.id);
                    setAcquisitionName(target.displayName);
                  }}
                  disabled={availableFoundingCashMinor < target.costMinor}
                />
              )
            ) : null}
          </View>
        ))
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
  warning: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.warning, marginTop: 4 },
  acquireForm: { gap: spacing.sm, minWidth: 140 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.sm,
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.text,
    backgroundColor: colors.background,
  },
  cancel: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, textAlign: 'center' },
});
