import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { ExecutiveRoleUiModel } from '@/domain/companies/ExecutiveRoles';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type ExecutiveRoleCardProps = {
  role: ExecutiveRoleUiModel;
  onHire?: () => void;
};

export function ExecutiveRoleCard({ role, onHire }: ExecutiveRoleCardProps) {
  const { formatMoneyCompact } = useGame();
  const { t } = useTranslation();

  return (
    <View style={[styles.card, role.hired && styles.cardHired]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{role.title}</Text>
          {role.automatesOperations ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{t.common.automatesTasksBadge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.status}>{role.hired ? t.common.hired : t.common.open}</Text>
      </View>
      <Text style={styles.description}>{role.description}</Text>
      <Text style={styles.meta}>
        {role.revenueBoostPercent > 0
          ? interpolate(t.executive.revenueBoost, { percent: role.revenueBoostPercent })
          : ''}
        {role.expenseReductionPercent > 0
          ? interpolate(t.executive.expenseReduction, { percent: role.expenseReductionPercent })
          : ''}
        {role.automatesOperations ? t.common.automatesTasks : t.common.manualOps}
      </Text>
      <Text style={styles.salary}>
        {interpolate(t.executive.salaryLine, {
          hireCost: formatMoneyCompact(role.hireCostMinor),
          salary: formatMoneyCompact(role.salaryMinor),
        })}
      </Text>
      {!role.hired && onHire ? (
        <Pressable onPress={onHire} style={styles.hireButton}>
          <Text style={styles.hireLabel}>
            {interpolate(t.executive.hireRole, { role: role.title.toUpperCase() })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.accentPurple}28`,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHired: {
    borderColor: `${colors.success}40`,
    backgroundColor: `${colors.success}08`,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  titleRow: { flex: 1, gap: spacing.xs },
  title: { fontFamily: fonts.display, fontSize: fontSizes.lg, color: colors.text, fontWeight: '700' },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: `${colors.success}50`,
    backgroundColor: `${colors.success}12`,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeLabel: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.success },
  status: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.primary },
  description: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18 },
  meta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted },
  salary: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.warning },
  hireButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hireLabel: { fontFamily: fonts.display, fontSize: fontSizes.xs, color: colors.primary, letterSpacing: 1 },
});
