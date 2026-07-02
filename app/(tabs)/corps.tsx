import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { Screen } from '@/components/Screen';
import { HealthBar } from '@/components/HealthBar';
import { StatBox } from '@/components/StatBox';
import { TaskCard } from '@/components/TaskCard';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { FoundCompanyForm } from '@/components/FoundCompanyForm';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function CorpsScreen() {
  const { dashboard, companies, tasks, performCompanyActivity, formatMoneyCompact } = useGame();

  return (
    <Screen
      header={
        <View>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <Text style={styles.headerMeta}>
            {dashboard.subsidiaryCount}/{dashboard.maxSubsidiaries} subsidiary slots
          </Text>
        </View>
      }>
      {companies.length === 0 ? (
        <EmptyState title="No subsidiaries" message="Complete onboarding or unlock slots via business rank." />
      ) : (
        companies.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/company/${c.id}`)}
            style={[styles.card, { borderColor: `${c.sectorColor}28` }]}>
            <View style={styles.header}>
              <View>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.sector}>{c.industryLabel}</Text>
              </View>
              <Text style={[styles.growth, { color: c.growth >= 0 ? colors.success : colors.danger }]}>
                {c.growth >= 0 ? '+' : ''}
                {c.growth.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.stats}>
              <StatBox label="REVENUE/HR" value={formatMoneyCompact(c.revenueMinor)} small />
              <StatBox
                label="PROFIT/HR"
                value={formatMoneyCompact(c.profitMinor)}
                valueColor={c.sectorColor}
                small
              />
              <StatBox
                label="HEALTH"
                value={`${c.health}%`}
                valueColor={c.health > 60 ? colors.success : colors.warning}
                small
              />
            </View>
            <HealthBar value={c.health} />
          </Pressable>
        ))
      )}

      <FoundCompanyForm />

      <SectionHeader title="Active tasks" subtitle={`${tasks.length} ready or cooling down`} />
      {tasks.length === 0 ? (
        <EmptyState title="No tasks" message="Tasks appear when subsidiaries are operational." />
      ) : (
        tasks.map((task) => (
          <TaskCard
            key={task.id}
            companyName={task.companyName}
            label={task.label}
            rewardMinor={task.rewardMinor}
            ready={task.ready}
            cooldownRemaining={task.cooldownRemaining}
            onPress={() => performCompanyActivity(task.companyId, task.activityId)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontFamily: fonts.display, fontSize: fontSizes.xl, color: colors.primary, fontWeight: '900' },
  headerMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontFamily: fonts.display, fontSize: fontSizes.lg, color: colors.text, fontWeight: '700' },
  sector: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 2 },
  growth: { fontFamily: fonts.mono, fontSize: fontSizes.md, fontWeight: '700' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
});
