import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '@/context/GameContext';
import { CashHeaderBar } from '@/components/CashHeaderBar';
import { useTranslation } from '@/i18n';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { ready, dashboard } = useGame();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!dashboard.onboardingCompleted || !dashboard.hasHolding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#07101e' }} edges={['top']}>
      <CashHeaderBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#07101e',
            borderTopColor: `${colors.primary}10`,
            paddingBottom: 20,
            paddingTop: 8,
            height: 72,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: {
            fontFamily: fonts.display,
            fontSize: fontSizes.micro,
            letterSpacing: 1,
            fontWeight: '700',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t.tabs.hq,
            tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="corps"
          options={{
            title: t.tabs.corps,
            tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="market"
          options={{
            title: t.tabs.market,
            tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="exec"
          options={{
            title: t.tabs.exec,
            tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
