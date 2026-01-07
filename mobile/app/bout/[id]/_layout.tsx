/**
 * Bout Route Layout
 *
 * Simple stack layout for bout-related screens
 */

import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/theme';

export default function BoutLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
