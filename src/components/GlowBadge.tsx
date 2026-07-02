import { StyleSheet, Text } from 'react-native';
import { radii } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type GlowBadgeProps = {
  label: string;
  color: string;
};

export function GlowBadge({ label, color }: GlowBadgeProps) {
  return (
    <Text style={[styles.badge, { color, borderColor: `${color}44`, backgroundColor: `${color}14` }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    letterSpacing: 1,
    overflow: 'hidden',
  },
});
