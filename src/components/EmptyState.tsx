import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.primary}10`,
    borderRadius: 8,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: '700',
  },
  message: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
