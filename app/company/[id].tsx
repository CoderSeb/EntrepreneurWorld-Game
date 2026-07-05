import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { formatBottleneckHint } from '@/i18n/economyLabels';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatBox } from '@/components/StatBox';
import { HealthBar } from '@/components/HealthBar';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { ExecutiveRoleCard } from '@/components/ExecutiveRoleCard';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { MAX_PAYROLL_LEVEL, MIN_PAYROLL_LEVEL } from '@/domain/companies/EmployeeService';
import { EXECUTIVE_AUTOMATION_POLICIES } from '@/domain/viewModels/CompanyUiModel';

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
    adjustCompanyEmployees,
    setCompanyPayrollLevel,
    setCompanyAutomationPolicy,
    payCompanyIntegrationDebt,
    formatMoneyCompact,
    availableCompanyFundingMinor,
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

  const companyFundingMinor = availableCompanyFundingMinor(company.id);
  const systemsMaxed = company.nextAutomationCostMinor === null;
  const canAffordSystems =
    company.nextAutomationCostMinor !== null && companyFundingMinor >= company.nextAutomationCostMinor;

  const trackMaxed =
    company.preferredTrackId !== null &&
    company.preferredTrackLevel >= company.preferredTrackMaxLevel;
  const canAffordTrack =
    company.nextPreferredTrackCostMinor !== null &&
    companyFundingMinor >= company.nextPreferredTrackCostMinor;

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

  const handleHireExecutive = (roleId: string, hireCostMinor: number) => {
    if (companyFundingMinor < hireCostMinor) {
      Alert.alert(t.company.hireFailedTitle, t.executive.insufficientFunds);
      return;
    }
    const result = hireExecutiveRole(company.id, roleId);
    if (!result.success) {
      Alert.alert(t.company.hireFailedTitle, result.errorMessage);
    }
  };

  const handleEmployeeDelta = (delta: number) => {
    const result = adjustCompanyEmployees(company.id, delta);
    if (!result.success) {
      Alert.alert(t.company.upgradeFailedTitle, result.errorMessage);
    }
  };

  const handlePayrollChange = (delta: number) => {
    const nextLevel = company.payrollLevel + delta;
    if (nextLevel < MIN_PAYROLL_LEVEL || nextLevel > MAX_PAYROLL_LEVEL) {
      return;
    }
    const result = setCompanyPayrollLevel(company.id, nextLevel);
    if (!result.success) {
      Alert.alert(t.company.upgradeFailedTitle, result.errorMessage);
    }
  };

  const nowUnix = Math.floor(Date.now() / 1000);
  const marginalLabel =
    company.marginalEmployeeProfitMinor >= 0
      ? interpolate(t.company.marginalProfit, {
          amount: formatMoneyCompact(company.marginalEmployeeProfitMinor),
        })
      : interpolate(t.company.marginalLoss, {
          amount: formatMoneyCompact(Math.abs(company.marginalEmployeeProfitMinor)),
        });

  const preferredTrackName = company.preferredTrackName?.toUpperCase() ?? 'GROWTH';

  const lifecycleLabel =
    company.lifecyclePhase === 'startup'
      ? t.company.lifecycleStartup
      : company.lifecyclePhase === 'growth'
        ? t.company.lifecycleGrowth
        : t.company.lifecycleMature;

  const bottleneckLabel = company.bottleneckHint
    ? formatBottleneckHint(company.bottleneckHint, t, formatMoneyCompact)
    : null;

  const handlePolicyChange = (policy: typeof company.automationPolicy) => {
    if (!company.hasTaskAutomation) {
      return;
    }
    setCompanyAutomationPolicy(company.id, policy);
  };

  const handlePayIntegration = () => {
    const payment = Math.min(company.integrationDebtMinor, company.cashBalanceMinor);
    if (payment <= 0) {
      Alert.alert(t.company.upgradeFailedTitle, t.company.insufficientCash);
      return;
    }
    const result = payCompanyIntegrationDebt(company.id, payment);
    if (!result.success) {
      Alert.alert(t.company.upgradeFailedTitle, result.errorMessage);
    }
  };

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
        <StatBox label={t.company.companyCash} value={formatMoneyCompact(company.cashBalanceMinor)} valueColor={colors.warning} small />
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

      <SectionHeader title={t.company.lifecycleTitle} subtitle={lifecycleLabel} />

      {bottleneckLabel ? (
        <Text style={styles.preview}>{bottleneckLabel}</Text>
      ) : null}

      <SectionHeader
        title={t.company.economyBreakdownTitle}
        subtitle={t.company.economyBreakdownSubtitle}
      />
      {company.economyBreakdown.slice(0, 8).map((line) => (
        <Text key={line.id} style={styles.healthMeta}>
          {line.label}: {formatMoneyCompact(Math.abs(line.amountMinorPerHour))}
          {t.common.perHour}
          {line.amountMinorPerHour < 0 ? ' (−)' : line.kind === 'expense' ? '' : ''}
        </Text>
      ))}

      <SectionHeader title={t.company.activeEffectsTitle} />
      {company.activeEffectSummaries.length === 0 ? (
        <Text style={styles.healthMeta}>{t.company.activeEffectsEmpty}</Text>
      ) : (
        company.activeEffectSummaries.map((summary) => (
          <Text key={summary} style={styles.preview}>
            {summary}
          </Text>
        ))
      )}

      {company.hasTaskAutomation ? (
        <>
          <SectionHeader
            title={t.company.automationPolicyTitle}
            subtitle={t.company.automationPolicySubtitle}
          />
          <View style={styles.policyRow}>
            {EXECUTIVE_AUTOMATION_POLICIES.map((policy) => (
              <Pressable
                key={policy}
                onPress={() => handlePolicyChange(policy)}
                style={[
                  styles.policyChip,
                  company.automationPolicy === policy && styles.policyChipActive,
                ]}>
                <Text
                  style={[
                    styles.policyLabel,
                    company.automationPolicy === policy && styles.policyLabelActive,
                  ]}>
                  {policy.replace(/_/g, ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {!company.integrationComplete && company.integrationDebtMinor > 0 ? (
        <>
          <SectionHeader
            title={t.company.integrationDebtTitle}
            subtitle={t.company.integrationDebtSubtitle}
          />
          <Text style={styles.healthMeta}>
            {formatMoneyCompact(company.integrationDebtMinor)} remaining
          </Text>
          <PrimaryButton
            label={interpolate(t.company.integrationPay, {
              amount: formatMoneyCompact(Math.min(company.integrationDebtMinor, company.cashBalanceMinor)),
            })}
            onPress={handlePayIntegration}
            disabled={company.cashBalanceMinor <= 0}
          />
        </>
      ) : null}

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

      <SectionHeader title={t.company.employeesTitle} subtitle={t.company.employeesSubtitle} />
      <Text style={styles.healthMeta}>
        {interpolate(t.company.employeeLimit, {
          count: company.employeeCount,
          max: company.maxEmployees,
          level: company.level,
        })}
      </Text>
      <View style={styles.employeeRow}>
        <StatBox label={t.company.employeeCount} value={String(company.employeeCount)} small />
        <View style={styles.stepper}>
          <Pressable
            onPress={() => handleEmployeeDelta(-1)}
            disabled={company.employeeCount <= 0}
            style={[styles.stepButton, company.employeeCount <= 0 && styles.stepButtonDisabled]}>
            <Text style={styles.stepLabel}>−</Text>
          </Pressable>
          <Pressable
            onPress={() => handleEmployeeDelta(1)}
            disabled={company.employeeCount >= company.maxEmployees}
            style={[
              styles.stepButton,
              company.employeeCount >= company.maxEmployees && styles.stepButtonDisabled,
            ]}>
            <Text style={styles.stepLabel}>+</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.employeeRow}>
        <StatBox label={t.company.payrollLevel} value={`${company.payrollLevel}/${MAX_PAYROLL_LEVEL}`} small />
        <View style={styles.stepper}>
          <Pressable
            onPress={() => handlePayrollChange(-1)}
            disabled={company.payrollLevel <= MIN_PAYROLL_LEVEL}
            style={[styles.stepButton, company.payrollLevel <= MIN_PAYROLL_LEVEL && styles.stepButtonDisabled]}>
            <Text style={styles.stepLabel}>−</Text>
          </Pressable>
          <Pressable
            onPress={() => handlePayrollChange(1)}
            disabled={company.payrollLevel >= MAX_PAYROLL_LEVEL}
            style={[
              styles.stepButton,
              company.payrollLevel >= MAX_PAYROLL_LEVEL && styles.stepButtonDisabled,
            ]}>
            <Text style={styles.stepLabel}>+</Text>
          </Pressable>
        </View>
      </View>
      <Text
        style={[
          styles.healthMeta,
          company.marginalEmployeeProfitMinor >= 0 ? styles.positiveMeta : styles.negativeMeta,
        ]}>
        {marginalLabel}
      </Text>

      <SectionHeader title={t.company.leadershipTitle} subtitle={t.company.leadershipSubtitle} />
      {executives.length === 0 ? (
        <EmptyState title={t.company.noRolesTitle} message={t.company.noRolesMessage} />
      ) : (
        executives.map((role) => (
          <ExecutiveRoleCard
            key={role.roleId}
            role={role}
            nowUnix={nowUnix}
            canAfford={companyFundingMinor >= role.hireCostMinor}
            onHire={
              !role.hired
                ? () => handleHireExecutive(role.roleId, role.hireCostMinor)
                : undefined
            }
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
                    : interpolate(t.common.cooldownSeconds, { seconds: task.cooldownRemaining })}
                {task.effectDescription
                  ? interpolate(t.company.taskEffect, { effect: task.effectDescription })
                  : task.rewardMinor > 0
                    ? interpolate(t.company.taskReward, { reward: formatMoneyCompact(task.rewardMinor) })
                    : ''}
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
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stepper: { flexDirection: 'row', gap: spacing.sm },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepButtonDisabled: { opacity: 0.4 },
  stepLabel: { fontFamily: fonts.display, fontSize: fontSizes.lg, color: colors.primary },
  positiveMeta: { color: colors.success },
  negativeMeta: { color: colors.danger },
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
  policyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  policyChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  policyChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
  policyLabel: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, textTransform: 'capitalize' },
  policyLabelActive: { color: colors.primary },
});
