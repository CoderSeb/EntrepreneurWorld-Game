import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';

type HealthBarProps = {
  value: number;
};

export function HealthBar({ value }: HealthBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const barColor = clamped > 60 ? colors.success : clamped > 30 ? colors.warning : colors.danger;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: barColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
