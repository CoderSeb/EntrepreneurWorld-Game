import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
    previewRevenueForCompany,
    tasks,
    performCompanyActivity,
    hireExecutiveRole,
    getCompanyExecutiveRoles,
    upgradeCompanyTrack,
    upgradeCompanyAutomation,
    formatMoneyCompact,
    playerCashMinor,
  } = useGame();
  const { t } = useTranslation();
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

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
  const levelProgressPercent = Math.round(company.levelProgress * 100);

  const systemsMaxed = company.nextAutomationCostMinor === null;
  const canAffordSystems =
    company.nextAutomationCostMinor !== null && playerCashMinor >= company.nextAutomationCostMinor;

  const trackMaxed =
    company.preferredTrackId !== null &&
    company.preferredTrackLevel >= company.preferredTrackMaxLevel;
  const canAffordTrack =
    company.nextPreferredTrackCostMinor !== null &&
    playerCashMinor >= company.nextPreferredTrackCostMinor;

  const trackPreviewMinor =
    company.preferredTrackId && !trackMaxed
      ? previewRevenueForCompany(company.id, {
          trackLevelDelta: { trackId: company.preferredTrackId, delta: 1 },
        })
      : null;

  const systemsPreviewMinor = !systemsMaxed
    ? previewRevenueForCompany(company.id, {
        automationLevel: company.automationLevel + 1,
      })
    : null;

  const handleTrackUpgrade = () => {
    if (!company.preferredTrackId || trackMaxed) {
      return;
    }
    if (!canAffordTrack) {
      setUpgradeError(t.company.insufficientCash);
      return;
    }
    const result = upgradeCompanyTrack(company.id, company.preferredTrackId);
    if (!result.success) {
      setUpgradeError(result.errorMessage);
      Alert.alert(t.company.upgradeFailedTitle, result.errorMessage);
      return;
    }
    setUpgradeError(null);
  };

  const handleSystemsUpgrade = () => {
    if (systemsMaxed) {
      return;
    }
    if (!canAffordSystems) {
      setUpgradeError(t.company.insufficientCash);
      return;
    }
    const result = upgradeCompanyAutomation(company.id);
    if (!result.success) {
      setUpgradeError(result.errorMessage);
      Alert.alert(t.company.upgradeFailedTitle, result.errorMessage);
      return;
    }
    setUpgradeError(null);
  };

  const preferredTrackName = company.preferredTrackName?.toUpperCase() ?? 'GROWTH';

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

      {company.preferredTrackId && company.preferredTrackName ? (
        <>
          <SectionHeader
            title={interpolate(t.company.growthTrackTitle, { trackName: company.preferredTrackName })}
            subtitle={interpolate(t.company.growthTrackSubtitle, {
              bonus: company.preferredTrackRevenueBonusPercent,
            })}
          />
          <Text style={styles.healthMeta}>
            {trackMaxed
              ? interpolate(t.company.trackMaxed, { max: company.preferredTrackMaxLevel })
              : interpolate(t.company.growthTrackLevel, {
                  current: company.preferredTrackLevel,
                  max: company.preferredTrackMaxLevel,
                })}
          </Text>
          {trackPreviewMinor !== null ? (
            <Text style={styles.preview}>
              {interpolate(t.company.upgradePreview, {
                current: formatMoneyCompact(company.revenueMinor),
                next: formatMoneyCompact(trackPreviewMinor),
              })}
            </Text>
          ) : null}
          {!trackMaxed ? (
            <PrimaryButton
              label={interpolate(t.company.upgradeGrowthTrack, {
                trackName: preferredTrackName,
                from: company.preferredTrackLevel,
                to: company.preferredTrackLevel + 1,
                cost: formatMoneyCompact(company.nextPreferredTrackCostMinor ?? 0),
              })}
              onPress={handleTrackUpgrade}
              disabled={!canAffordTrack}
            />
          ) : null}
        </>
      ) : null}

      <SectionHeader
        title={t.company.systemsTitle}
        subtitle={
          systemsMaxed
            ? interpolate(t.company.systemsMaxed, { level: company.maxAutomationLevel })
            : t.company.systemsSubtitle
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
      {systemsPreviewMinor !== null ? (
        <Text style={styles.preview}>
          {interpolate(t.company.upgradePreview, {
            current: formatMoneyCompact(company.revenueMinor),
            next: formatMoneyCompact(systemsPreviewMinor),
          })}
        </Text>
      ) : null}
      {!systemsMaxed ? (
        <PrimaryButton
          label={interpolate(t.company.upgradeSystems, {
            from: company.automationLevel,
            to: company.automationLevel + 1,
            cost: formatMoneyCompact(company.nextAutomationCostMinor ?? 0),
          })}
          onPress={handleSystemsUpgrade}
          disabled={!canAffordSystems}
        />
      ) : null}

      {upgradeError ? <Text style={styles.warning}>{upgradeError}</Text> : null}

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
          company.hasTaskAutomation
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
                {company.hasTaskAutomation
                  ? t.common.automated
                  : task.ready
                    ? t.common.ready
                    : interpolate(t.common.cooldownSeconds, { seconds: task.cooldownRemaining })}{' '}
                {interpolate(t.company.taskReward, { reward: formatMoneyCompact(task.rewardMinor) })}
              </Text>
            </View>
            {!company.hasTaskAutomation ? (
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
  preview: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  warning: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
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
  taskMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 2 },
  runButton: { minWidth: 72 },
});
