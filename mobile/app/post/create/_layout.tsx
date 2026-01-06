/**
 * Create Post Layout
 */

import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/theme';

export default function CreatePostLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_bottom',
      }}
    />
  );
}
