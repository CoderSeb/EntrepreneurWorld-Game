import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';

type CardProps = {
  children: ReactNode;
  accentColor?: string;
  glow?: boolean;
  style?: ViewStyle;
};

export function Card({ children, accentColor = colors.primary, glow = false, style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: `${accentColor}22`,
          shadowColor: glow ? accentColor : 'transparent',
        },
        glow && styles.glow,
        style,
      ]}
    >
      <View style={[styles.topLine, { backgroundColor: accentColor }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.35,
  },
});
