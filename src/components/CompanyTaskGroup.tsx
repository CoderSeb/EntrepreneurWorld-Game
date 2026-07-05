import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { TaskCard } from '@/components/TaskCard';
import { CompanyUiModel, TaskUiModel } from '@/domain/viewModels/CompanyUiModel';
import { interpolate, useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type CompanyTaskGroupProps = {
  company: CompanyUiModel;
  tasks: TaskUiModel[];
  onRunTask: (companyId: string, activityId: string) => void;
};

export function CompanyTaskGroup({ company, tasks, onRunTask }: CompanyTaskGroupProps) {
  const { t } = useTranslation();
  const readyCount = tasks.filter((task) => task.ready).length;

  return (
    <View style={[styles.group, { borderColor: `${company.sectorColor}28` }]}>
      <Pressable onPress={() => router.push(`/company/${company.id}`)} style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyMeta}>
            {company.industryLabel}
            {readyCount > 0
              ? ` · ${interpolate(t.corps.tasksReadyCount, { count: readyCount })}`
              : ''}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: company.sectorColor }]}>›</Text>
      </Pressable>
      <View style={styles.taskList}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            label={task.label}
            rewardMinor={task.rewardMinor}
            instantCashPreviewMinor={task.instantCashPreviewMinor}
            effectDescription={task.effectDescription}
            ready={task.ready}
            cooldownRemaining={task.cooldownRemaining}
            showCompanyName={false}
            onPress={() => onRunTask(task.companyId, task.activityId)}
          />
        ))}
      </View>
    </View>
  );
}

export function groupTasksByCompany(
  companies: CompanyUiModel[],
  tasks: TaskUiModel[],
): { company: CompanyUiModel; tasks: TaskUiModel[] }[] {
  const byCompany = new Map<string, TaskUiModel[]>();
  for (const task of tasks) {
    const existing = byCompany.get(task.companyId) ?? [];
    existing.push(task);
    byCompany.set(task.companyId, existing);
  }
  return companies
    .map((company) => ({ company, tasks: byCompany.get(company.id) ?? [] }))
    .filter((entry) => entry.tasks.length > 0);
}

export function useCompanyTaskGroups(companies: CompanyUiModel[], tasks: TaskUiModel[]) {
  return useMemo(() => groupTasksByCompany(companies, tasks), [companies, tasks]);
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  companyName: { fontFamily: fonts.display, fontSize: fontSizes.md, color: colors.text, fontWeight: '800' },
  companyMeta: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted },
  chevron: { fontFamily: fonts.display, fontSize: fontSizes.xl, fontWeight: '700' },
  taskList: { paddingHorizontal: spacing.md, gap: spacing.sm },
});
