import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { ExecutiveRoleUiModel } from '@/domain/companies/ExecutiveRoles';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type ExecutiveRoleCardProps = {
  role: ExecutiveRoleUiModel;
  onHire?: () => void;
};

export function ExecutiveRoleCard({ role, onHire }: ExecutiveRoleCardProps) {
  const { formatMoneyCompact } = useGame();
  return (
    <View style={[styles.card, role.hired && styles.cardHired]}>
      <View style={styles.header}>
        <Text style={styles.title}>{role.title}</Text>
        <Text style={styles.status}>{role.hired ? 'HIRED' : 'OPEN'}</Text>
      </View>
      <Text style={styles.description}>{role.description}</Text>
      <Text style={styles.meta}>
        {role.revenueBoostPercent > 0 ? `+${role.revenueBoostPercent}% revenue · ` : ''}
        {role.expenseReductionPercent > 0 ? `-${role.expenseReductionPercent}% costs · ` : ''}
        {role.automatesOperations ? 'Automates tasks' : 'Manual ops'}
      </Text>
      <Text style={styles.salary}>
        Hire {formatMoneyCompact(role.hireCostMinor)} · {formatMoneyCompact(role.salaryMinor)}/hr
      </Text>
      {!role.hired && onHire ? (
        <Pressable onPress={onHire} style={styles.hireButton}>
          <Text style={styles.hireLabel}>HIRE {role.title.toUpperCase()}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: fontSizes.lg, color: colors.text, fontWeight: '700' },
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
