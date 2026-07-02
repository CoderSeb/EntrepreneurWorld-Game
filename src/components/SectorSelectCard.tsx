import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EconomyConfig, getIndustryFoundingCost, getUpgradeTrack, IndustryDefinition } from '@/domain/config/EconomyConfig';
import { resolveIndustryPresentation } from '@/domain/config/IndustryPresentation';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type SectorSelectCardProps = {
  industry: IndustryDefinition;
  config: EconomyConfig;
  selected: boolean;
  onPress: () => void;
  formatRevenue: (minorUnits: number) => string;
};

export function SectorSelectCard({
  industry,
  config,
  selected,
  onPress,
  formatRevenue,
}: SectorSelectCardProps) {
  const presentation = resolveIndustryPresentation(industry);
  const iconName = presentation.iconName as keyof typeof Ionicons.glyphMap;
  const trackName =
    getUpgradeTrack(config, industry.preferredTrackId ?? '')?.displayName ??
    industry.preferredTrackId ??
    '—';
  const foundingCost = getIndustryFoundingCost(industry, config);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: selected ? `${presentation.accentColor}60` : colors.border,
          backgroundColor: selected ? `${presentation.accentColor}14` : colors.surface,
        },
      ]}>
      <Ionicons name={iconName in Ionicons.glyphMap ? iconName : 'business'} size={22} color={presentation.accentColor} />
      <Text style={styles.title}>{industry.displayName}</Text>
      <Text style={styles.tagline}>{presentation.tagline}</Text>
      <Text style={styles.stats}>
        {formatRevenue(industry.baseRevenuePerHourMinor)}/hr · {presentation.marginPercent}% margin
      </Text>
      <Text style={styles.meta}>
        {trackName} track · {formatRevenue(foundingCost)} to found
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 132,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  stats: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.micro,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.micro,
    color: colors.primary,
    marginTop: 'auto',
  },
});
