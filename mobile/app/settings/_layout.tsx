/**
 * Settings stack layout - hides default header since sub-pages have custom headers
 */

import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
