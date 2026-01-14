/**
 * Root layout with providers
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ToastProvider } from '../hooks/useToast';
import { OnboardingProvider } from '../hooks/useOnboarding';
import { GuestPicksProvider } from '../hooks/useGuestPicks';
import { AuthProvider } from '../hooks/useAuth';
import { ThemeProvider, useTheme } from '../lib/theme';
import { DrawerProvider } from '../lib/DrawerContext';
import { AppDrawer } from '../components/navigation/AppDrawer';
import { initSentry } from '../lib/sentry';
import { NetworkStatusBanner } from '../components/ui';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

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
            headerBackTitle: 'Back',
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
        <Stack.Screen
          name="my-record"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="crowd"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
      <AppDrawer />
    </View>
  );
}

export default function RootLayout() {
  // Load custom fonts
  const [fontsLoaded, fontError] = useFonts({
    'BebasNeue': require('../assets/fonts/BebasNeue-Regular.ttf'),
  });

  // Initialize Sentry after component mounts
  useEffect(() => {
    initSentry();
  }, []);

  // Hide splash when fonts load or error
  useEffect(() => {
    if (fontError) {
      console.warn('Font loading error:', fontError);
    }
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts are loaded (or errored)
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
      </AuthProvider>
    </QueryClientProvider>
  );
}
