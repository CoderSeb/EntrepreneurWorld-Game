import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type ExecCardProps = {
  name: string;
  revenueBoost: number;
  salaryMinor: number;
  assignedCompanyName: string | null;
  available: boolean;
  onHire?: () => void;
};

export function ExecCard({
  name,
  revenueBoost,
  salaryMinor,
  assignedCompanyName,
  available,
  onHire,
}: ExecCardProps) {
  const { formatMoneyCompact } = useGame();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.boost}>+{revenueBoost}% REV</Text>
      </View>
      <Text style={styles.salary}>{formatMoneyCompact(salaryMinor)}/hr salary</Text>
      <Text style={styles.assignment}>
        {assignedCompanyName ? `Assigned · ${assignedCompanyName}` : 'Unassigned'}
      </Text>
      {available && onHire ? (
        <Pressable onPress={onHire} style={styles.hireButton}>
          <Text style={styles.hireLabel}>HIRE</Text>
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
    borderRadius: 6,
    padding: spacing.md,
    gap: 4,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontFamily: fonts.display, fontSize: fontSizes.md, color: colors.text, fontWeight: '700' },
  boost: { fontFamily: fonts.mono, fontSize: fontSizes.sm, color: colors.success },
  salary: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted },
  assignment: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.textSecondary },
  hireButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hireLabel: { fontFamily: fonts.display, fontSize: fontSizes.xs, color: colors.primary, letterSpacing: 1 },
});
