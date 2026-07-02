import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type TaskCardProps = {
  companyName: string;
  label: string;
  rewardMinor: number;
  ready: boolean;
  cooldownRemaining: number;
  onPress: () => void;
};

export function TaskCard({
  companyName,
  label,
  rewardMinor,
  ready,
  cooldownRemaining,
  onPress,
}: TaskCardProps) {
  const { formatMoneyCompact } = useGame();
  return (
    <Pressable
      onPress={onPress}
      disabled={!ready}
      style={[styles.card, !ready && styles.cardDisabled]}
    >
      <View style={styles.header}>
        <Text style={styles.company} numberOfLines={2}>
          {companyName.toUpperCase()}
        </Text>
        <Text style={[styles.reward, { color: ready ? colors.success : colors.muted }]}>
          +{formatMoneyCompact(rewardMinor)}
        </Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.meta}>
        {ready ? 'READY' : `COOLDOWN ${cooldownRemaining}s`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.primary}18`,
    borderRadius: 6,
    padding: spacing.md,
    gap: 4,
  },
  cardDisabled: { opacity: 0.55 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  company: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, letterSpacing: 1, flex: 1, flexShrink: 1 },
  reward: { fontFamily: fonts.mono, fontSize: fontSizes.md, fontWeight: '700' },
  label: { fontFamily: fonts.display, fontSize: fontSizes.md, color: colors.text, fontWeight: '700' },
  meta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.primary },
});
