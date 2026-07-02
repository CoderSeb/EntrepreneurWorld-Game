import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useGame } from '@/context/GameContext';
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

  const company = id ? getCompanyById(id) : null;
  if (!company) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.missing}>
        <EmptyState title="Company not found" message="This subsidiary may have been sold or removed." />
        <PrimaryButton label="BACK" onPress={() => router.back()} />
      </Screen>
    );
  }

  const companyTasks = tasks.filter((t) => t.companyId === company.id);
  const executives = getCompanyExecutiveRoles(company.id);
  const hasTaskAutomation = executives.some((role) => role.hired && role.automatesOperations);
  const operationsTrack = config.upgradeTracks.find((t) => t.id === 'operations');
  const levelProgressPercent = Math.round(company.levelProgress * 100);
  const automationMaxed = company.nextAutomationCostMinor === null;
  const canAffordAutomation =
    company.nextAutomationCostMinor !== null && playerCashMinor >= company.nextAutomationCostMinor;

  return (
    <Screen
      header={
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: company.sectorColor }]}>{company.name}</Text>
            <Text style={styles.subtitle}>
              {company.industryLabel} · LEVEL {company.level}
            </Text>
          </View>
        </View>
      }>
      <View style={styles.stats}>
        <StatBox label="REV/HR" value={formatMoneyCompact(company.revenueMinor)} small />
        <StatBox label="PROFIT/HR" value={formatMoneyCompact(company.profitMinor)} valueColor={colors.success} small />
        <StatBox label="EXECUTIVES" value={String(company.hiredExecutiveCount)} small />
      </View>

      <HealthBar value={company.health} />
      <Text style={styles.healthMeta}>Portfolio health {company.health}%</Text>

      <SectionHeader title="Level progress" subtitle="Levels up automatically from company profit" />
      <HealthBar value={levelProgressPercent} />
      <Text style={styles.healthMeta}>
        {levelProgressPercent}% toward level {company.level + 1}
      </Text>

      {operationsTrack ? (
        <>
          <SectionHeader title="Operations track" subtitle="Invest to scale revenue" />
          <PrimaryButton
            label={`${operationsTrack.displayName.toUpperCase()} TRACK`}
            onPress={() => upgradeCompanyTrack(company.id, operationsTrack.id)}
          />
        </>
      ) : null}

      <SectionHeader
        title="Automation"
        subtitle={
          automationMaxed
            ? `Max level ${company.maxAutomationLevel} — revenue and efficiency bonuses active`
            : 'Upgrade systems to boost revenue (small expense increase)'
        }
      />
      <View style={styles.automationRow}>
        <StatBox label="LEVEL" value={`${company.automationLevel}/${company.maxAutomationLevel}`} small />
        {company.nextAutomationCostMinor !== null ? (
          <StatBox label="NEXT UPGRADE" value={formatMoneyCompact(company.nextAutomationCostMinor)} small />
        ) : null}
      </View>
      {!automationMaxed ? (
        <PrimaryButton
          label={`UPGRADE AUTOMATION · ${formatMoneyCompact(company.nextAutomationCostMinor ?? 0)}`}
          onPress={() => upgradeCompanyAutomation(company.id)}
          disabled={!canAffordAutomation}
        />
      ) : null}

      <SectionHeader title="Leadership" subtitle="Hire executives to automate and boost this company" />
      {executives.length === 0 ? (
        <EmptyState title="No roles configured" message="Executive roles will appear for this company type." />
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
        title="Tasks"
        subtitle={hasTaskAutomation ? 'CEO/COO automates ready tasks' : `${companyTasks.length} activities`}
      />
      {companyTasks.length === 0 ? (
        <EmptyState title="No tasks" message="Tasks unlock as the company levels up." />
      ) : (
        companyTasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={styles.taskBody}>
              <Text style={styles.taskLabel}>{task.label}</Text>
              <Text style={styles.taskMeta}>
                {hasTaskAutomation
                  ? 'Automated'
                  : task.ready
                    ? 'Ready'
                    : `${task.cooldownRemaining}s cooldown`}{' '}
                · +{formatMoneyCompact(task.rewardMinor)}
              </Text>
            </View>
            {!hasTaskAutomation ? (
              <PrimaryButton
                label="RUN"
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
