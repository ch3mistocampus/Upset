/**
 * Root layout with providers
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ToastProvider } from '../hooks/useToast';
import { OnboardingProvider } from '../hooks/useOnboarding';
import { GuestPicksProvider } from '../hooks/useGuestPicks';
import { ThemeProvider, useTheme } from '../lib/theme';
import { DrawerProvider } from '../lib/DrawerContext';
import { AppDrawer } from '../components/navigation/AppDrawer';
import { initSentry } from '../lib/sentry';
import { NetworkStatusBanner } from '../components/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <NetworkStatusBanner />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="friends/[id]" options={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="friends/add" options={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen
          name="user/[id]"
          options={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 200,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
            animation: 'fade',
            animationDuration: 200,
          }}
        />
        <Stack.Screen name="post/notifications" options={{ title: 'Notifications', headerBackTitle: 'Back' }} />
        <Stack.Screen name="post/search" options={{ title: 'Search', headerBackTitle: 'Back' }} />
        <Stack.Screen name="post/create" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="fighter/[id]" options={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen
          name="fighters"
          options={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 200,
          }}
        />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
      <AppDrawer />
    </View>
  );
}

export default function RootLayout() {
  // Initialize Sentry after component mounts
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GuestPicksProvider>
        <OnboardingProvider>
          <ThemeProvider>
            <DrawerProvider>
              <ToastProvider>
                <RootNavigator />
              </ToastProvider>
            </DrawerProvider>
          </ThemeProvider>
        </OnboardingProvider>
      </GuestPicksProvider>
    </QueryClientProvider>
  );
}
