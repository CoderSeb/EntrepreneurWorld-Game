import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { StatBox } from '@/components/StatBox';
import { HealthBar } from '@/components/HealthBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function HqScreen() {
  const { dashboard, companies, offlineSummary, dismissOfflineSummary, formatMoneyCompact } = useGame();
  const { t } = useTranslation();
  const totalRev = companies.reduce((s, c) => s + c.revenueMinor, 0);
  const totalProfit = companies.reduce((s, c) => s + c.profitMinor, 0);

  return (
    <Screen
      header={
        <View style={styles.header}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.congName} numberOfLines={2}>
              {dashboard.conglomerateName.toUpperCase() || t.common.yourEmpire.toUpperCase()}
            </Text>
            <Text style={styles.subtitle}>
              {interpolate(t.hq.subtitle, { rank: dashboard.businessRank })}
            </Text>
          </View>
        </View>
      }>
      {offlineSummary ? (
        <Card accentColor={colors.success} glow>
          <Text style={styles.cardLabel}>{t.hq.offlineProgress}</Text>
          <Text style={styles.offlineValue}>
            +{formatMoneyCompact(offlineSummary.result.netIncome.amountMinorUnits)}
          </Text>
          <Text style={styles.offlineMeta}>
            {interpolate(t.hq.offlineMeta, {
              hours: Math.round(offlineSummary.offlineSeconds / 3600),
              effective: offlineSummary.result.effectiveHours.toFixed(1),
            })}
          </Text>
          <PrimaryButton label={t.common.dismiss} onPress={dismissOfflineSummary} />
        </Card>
      ) : null}

      <Card accentColor={colors.primary} glow>
        <Text style={styles.cardLabel}>{t.hq.netWorth}</Text>
        <Text style={styles.heroValue}>{formatMoneyCompact(dashboard.netWorth.amountMinorUnits)}</Text>
        <View style={styles.netWorthRow}>
          <Text style={styles.netWorthMeta}>
            {t.hq.conglomerateNetWorth}: {formatMoneyCompact(dashboard.conglomerateNetWorth.amountMinorUnits)}
          </Text>
          <Text style={styles.netWorthMeta}>
            {t.hq.personalNetWorth}: {formatMoneyCompact(dashboard.personalNetWorth.amountMinorUnits)}
          </Text>
        </View>
      </Card>

      <View style={styles.kpiRow}>
        <Card accentColor={colors.warning} style={styles.kpiCard}>
          <StatBox label={t.hq.totalRevPerHr} value={formatMoneyCompact(totalRev)} valueColor={colors.warning} small />
        </Card>
        <Card accentColor={colors.success} style={styles.kpiCard}>
          <StatBox label={t.hq.netProfitPerHr} value={formatMoneyCompact(totalProfit)} valueColor={colors.success} small />
        </Card>
        <Card accentColor={colors.accentPurple} style={styles.kpiCard}>
          <StatBox
            label={t.common.companies}
            value={`${dashboard.subsidiaryCount}/${dashboard.maxSubsidiaries}`}
            valueColor={colors.accentPurple}
            small
          />
        </Card>
      </View>

      <SectionHeader
        title={t.hq.portfolioHealth}
        subtitle={interpolate(t.hq.portfolioSubtitle, { count: companies.length })}
      />
      {companies.length === 0 ? (
        <EmptyState title={t.hq.noCompaniesTitle} message={t.hq.noCompaniesMessage} />
      ) : (
        companies.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/company/${c.id}`)}
            style={({ pressed }) => [
              styles.companyRow,
              { borderColor: `${c.sectorColor}18` },
              pressed && styles.companyRowPressed,
            ]}>
            <View style={styles.companyHeader}>
              <Text style={styles.companyName}>{c.name}</Text>
              <Text style={[styles.growth, { color: c.growth >= 0 ? colors.success : colors.danger }]}>
                {c.growth >= 0 ? '+' : ''}
                {c.growth.toFixed(1)}%
              </Text>
            </View>
            <HealthBar value={c.health} />
            <Text style={styles.healthMeta}>
              {interpolate(t.hq.healthMeta, {
                health: c.health,
                tasks: c.pendingTasks,
                level: c.level,
                executives:
                  c.hiredExecutiveCount > 0
                    ? interpolate(t.hq.executivesSuffix, { count: c.hiredExecutiveCount })
                    : '',
              })}
            </Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerTitleBlock: { flex: 1, flexShrink: 1 },
  congName: { fontFamily: fonts.display, fontSize: fontSizes.lg, color: colors.primary, fontWeight: '900' },
  subtitle: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted, letterSpacing: 2, marginTop: 2 },
  cardLabel: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, letterSpacing: 1.5, marginBottom: 4 },
  heroValue: { fontFamily: fonts.display, fontSize: fontSizes.hero, color: colors.primary, fontWeight: '900' },
  netWorthRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
  netWorthMeta: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted },
  offlineValue: { fontFamily: fonts.display, fontSize: fontSizes.xxl, color: colors.success, fontWeight: '800' },
  offlineMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginBottom: spacing.sm },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpiCard: { flex: 1 },
  companyRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: 8,
  },
  companyRowPressed: {
    opacity: 0.85,
    backgroundColor: `${colors.primary}08`,
  },
  companyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  companyName: { fontFamily: fonts.display, fontSize: fontSizes.lg, color: colors.text, fontWeight: '700' },
  growth: { fontFamily: fonts.mono, fontSize: fontSizes.md, fontWeight: '700' },
  healthMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted },
});
