import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatBox } from '@/components/StatBox';
import { HealthBar } from '@/components/HealthBar';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { ExecutiveRoleCard } from '@/components/ExecutiveRoleCard';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function CompanyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getCompanyById,
    config,
    upgradeCompanyTrack,
    upgradeCompanyAutomation,
    tasks,
    performCompanyActivity,
    hireExecutiveRole,
    getCompanyExecutiveRoles,
    formatMoneyCompact,
    playerCashMinor,
  } = useGame();
  const { t } = useTranslation();

  const company = id ? getCompanyById(id) : null;
  if (!company) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.missing}>
        <EmptyState title={t.company.notFoundTitle} message={t.company.notFoundMessage} />
        <PrimaryButton label={t.common.backButton} onPress={() => router.back()} />
      </Screen>
    );
  }

  const companyTasks = tasks.filter((task) => task.companyId === company.id);
  const executives = getCompanyExecutiveRoles(company.id);
  const hasTaskAutomation = executives.some((role) => role.hired && role.automatesOperations);
  const operationsTrack = config.upgradeTracks.find((track) => track.id === 'operations');
  const levelProgressPercent = Math.round(company.levelProgress * 100);
  const automationMaxed = company.nextAutomationCostMinor === null;
  const canAffordAutomation =
    company.nextAutomationCostMinor !== null && playerCashMinor >= company.nextAutomationCostMinor;

  return (
    <Screen
      header={
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>{t.common.back}</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: company.sectorColor }]}>{company.name}</Text>
            <Text style={styles.subtitle}>
              {interpolate(t.company.levelSubtitle, { industry: company.industryLabel, level: company.level })}
            </Text>
          </View>
        </View>
      }>
      <View style={styles.stats}>
        <StatBox label={t.company.revPerHr} value={formatMoneyCompact(company.revenueMinor)} small />
        <StatBox label={t.company.profitPerHr} value={formatMoneyCompact(company.profitMinor)} valueColor={colors.success} small />
        <StatBox label={t.company.executives} value={String(company.hiredExecutiveCount)} small />
      </View>

      <HealthBar value={company.health} />
      <Text style={styles.healthMeta}>
        {interpolate(t.company.portfolioHealth, { health: company.health })}
      </Text>

      <SectionHeader title={t.company.levelProgressTitle} subtitle={t.company.levelProgressSubtitle} />
      <HealthBar value={levelProgressPercent} />
      <Text style={styles.healthMeta}>
        {interpolate(t.company.levelProgressMeta, {
          percent: levelProgressPercent,
          nextLevel: company.level + 1,
        })}
      </Text>

      {operationsTrack ? (
        <>
          <SectionHeader title={t.company.operationsTrackTitle} subtitle={t.company.operationsTrackSubtitle} />
          <PrimaryButton
            label={interpolate(t.company.trackButton, { name: operationsTrack.displayName.toUpperCase() })}
            onPress={() => upgradeCompanyTrack(company.id, operationsTrack.id)}
          />
        </>
      ) : null}

      <SectionHeader
        title={t.company.automationTitle}
        subtitle={
          automationMaxed
            ? interpolate(t.company.automationMaxed, { level: company.maxAutomationLevel })
            : t.company.automationSubtitle
        }
      />
      <View style={styles.automationRow}>
        <StatBox
          label={t.common.level}
          value={`${company.automationLevel}/${company.maxAutomationLevel}`}
          small
        />
        {company.nextAutomationCostMinor !== null ? (
          <StatBox
            label={t.company.nextUpgrade}
            value={formatMoneyCompact(company.nextAutomationCostMinor)}
            small
          />
        ) : null}
      </View>
      {!automationMaxed ? (
        <PrimaryButton
          label={interpolate(t.company.upgradeAutomation, {
            cost: formatMoneyCompact(company.nextAutomationCostMinor ?? 0),
          })}
          onPress={() => upgradeCompanyAutomation(company.id)}
          disabled={!canAffordAutomation}
        />
      ) : null}

      <SectionHeader title={t.company.leadershipTitle} subtitle={t.company.leadershipSubtitle} />
      {executives.length === 0 ? (
        <EmptyState title={t.company.noRolesTitle} message={t.company.noRolesMessage} />
      ) : (
        executives.map((role) => (
          <ExecutiveRoleCard
            key={role.roleId}
            role={role}
            onHire={!role.hired ? () => hireExecutiveRole(company.id, role.roleId) : undefined}
          />
        ))
      )}

      <SectionHeader
        title={t.company.tasksTitle}
        subtitle={
          hasTaskAutomation
            ? t.company.tasksAutomatedSubtitle
            : interpolate(t.company.tasksCountSubtitle, { count: companyTasks.length })
        }
      />
      {companyTasks.length === 0 ? (
        <EmptyState title={t.company.noTasksTitle} message={t.company.noTasksMessage} />
      ) : (
        companyTasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={styles.taskBody}>
              <Text style={styles.taskLabel}>{task.label}</Text>
              <Text style={styles.taskMeta}>
                {hasTaskAutomation
                  ? t.common.automated
                  : task.ready
                    ? t.common.ready
                    : interpolate(t.common.cooldownSeconds, { seconds: task.cooldownRemaining })}{' '}
                {interpolate(t.company.taskReward, { reward: formatMoneyCompact(task.rewardMinor) })}
              </Text>
            </View>
            {!hasTaskAutomation ? (
              <PrimaryButton
                label={t.common.run}
                onPress={() => performCompanyActivity(task.companyId, task.activityId)}
                disabled={!task.ready}
                style={styles.runButton}
              />
            ) : null}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, justifyContent: 'center', gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  back: { fontFamily: fonts.mono, fontSize: fontSizes.sm, color: colors.primary, marginTop: 4 },
  headerText: { flex: 1 },
  title: { fontFamily: fonts.display, fontSize: fontSizes.xxl, fontWeight: '900' },
  subtitle: { fontFamily: fonts.mono, fontSize: fontSizes.sm, color: colors.muted, letterSpacing: 1, marginTop: 4 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  automationRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  healthMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted },
  taskRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskBody: { flex: 1 },
  taskLabel: { fontFamily: fonts.display, fontSize: fontSizes.md, color: colors.text },
  taskMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 4 },
  runButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minWidth: 72 },
});
