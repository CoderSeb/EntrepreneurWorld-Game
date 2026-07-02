import { Redirect } from 'expo-router';
import { useGame } from '@/context/GameContext';

export default function Index() {
  const { dashboard } = useGame();

  if (dashboard.onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
