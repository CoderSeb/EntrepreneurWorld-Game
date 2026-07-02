import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, disabled = false, style }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: `${colors.primary}18`,
    borderColor: `${colors.primary}50`,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  disabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: fontSizes.md,
    color: colors.primary,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  labelDisabled: {
    color: '#2a3a50',
  },
});
