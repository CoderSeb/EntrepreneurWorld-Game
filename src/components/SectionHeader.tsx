import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: string;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  textBlock: { flex: 1, gap: 2 },
  title: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.muted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  action: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
});
