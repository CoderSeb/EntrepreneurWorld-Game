import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@/theme/tokens';

type ScreenProps = PropsWithChildren<{
  header?: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}>;

export function Screen({ children, header, scroll = true, contentContainerStyle }: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {header ? (
        <LinearGradient colors={['#0d1a2e', colors.background]} style={styles.header}>
          {header}
        </LinearGradient>
      ) : null}
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.primary}12`,
  },
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl + 8,
    gap: spacing.md,
  },
});
