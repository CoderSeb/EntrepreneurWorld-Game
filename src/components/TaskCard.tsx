import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { formatDurationSeconds } from '@/domain/time/DurationFormat';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type TaskCardProps = {
  label: string;
  rewardMinor: number;
  instantCashPreviewMinor?: number;
  effectDescription?: string | null;
  ready: boolean;
  cooldownRemaining: number;
  onPress: () => void;
  companyName?: string;
  showCompanyName?: boolean;
};

export function TaskCard({
  companyName,
  showCompanyName = true,
  label,
  rewardMinor,
  instantCashPreviewMinor = 0,
  effectDescription,
  ready,
  cooldownRemaining,
  onPress,
}: TaskCardProps) {
  const { formatMoneyCompact } = useGame();
  const { t } = useTranslation();

  const cashPreviewMinor = instantCashPreviewMinor > 0 ? instantCashPreviewMinor : rewardMinor;

  const statusText = ready
    ? t.common.ready
    : interpolate(t.common.cooldownRemaining, {
        duration: formatDurationSeconds(cooldownRemaining),
      });

  const metaParts = [effectDescription, statusText].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      disabled={!ready}
      style={[styles.card, !ready && styles.cardDisabled]}
    >
      {showCompanyName && companyName ? (
        <View style={styles.header}>
          <Text style={styles.company} numberOfLines={2}>
            {companyName.toUpperCase()}
          </Text>
          {cashPreviewMinor > 0 ? (
            <Text style={[styles.reward, { color: ready ? colors.success : colors.muted }]}>
              +{formatMoneyCompact(cashPreviewMinor)}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.bodyRow}>
        <View style={styles.body}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
        </View>
        {cashPreviewMinor > 0 && !showCompanyName ? (
          <Text style={[styles.reward, { color: ready ? colors.success : colors.muted }]}>
            +{formatMoneyCompact(cashPreviewMinor)}
          </Text>
        ) : null}
      </View>
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
  bodyRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  body: { flex: 1, gap: 2 },
  company: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, letterSpacing: 1, flex: 1, flexShrink: 1 },
  reward: { fontFamily: fonts.mono, fontSize: fontSizes.md, fontWeight: '700' },
  label: { fontFamily: fonts.display, fontSize: fontSizes.md, color: colors.text, fontWeight: '700' },
  meta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.primary },
});
