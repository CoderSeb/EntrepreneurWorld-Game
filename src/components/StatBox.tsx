import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type StatBoxProps = {
  label: string;
  value: string;
  valueColor?: string;
  small?: boolean;
};

export function StatBox({ label, value, valueColor = colors.text, small = false }: StatBoxProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, small && styles.valueSmall, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.muted,
    letterSpacing: 1,
  },
  value: {
    fontFamily: fonts.monoMedium,
    fontSize: fontSizes.xl,
    fontWeight: '600',
  },
  valueSmall: {
    fontSize: fontSizes.lg,
  },
});
