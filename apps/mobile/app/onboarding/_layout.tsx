import { Stack } from 'expo-router';
import { useAppTheme } from '../../lib/providers';

export default function OnboardingLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="select-diocese" options={{ title: 'Select Diocese', headerShown: false }} />
      <Stack.Screen name="select-parish" options={{ title: 'Select Parish', headerShown: false }} />
    </Stack>
  );
}
