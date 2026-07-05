import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CashHeaderBar } from '@/components/CashHeaderBar';

export default function CompanyLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#07101e' }} edges={['top']}>
      <CashHeaderBar />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
