import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Orbitron_400Regular,
  Orbitron_700Bold,
} from '@expo-google-fonts/orbitron';
import {
  Exo2_400Regular,
  Exo2_600SemiBold,
} from '@expo-google-fonts/exo-2';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { GameProvider } from '@/context/GameContext';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Orbitron_400Regular,
    Orbitron_700Bold,
    Exo2_400Regular,
    Exo2_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  if (!loaded) {
    return null;
  }

  return (
    <GameProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </GameProvider>
  );
}
