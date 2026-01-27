/**
 * Root layout with providers
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ToastProvider } from '../hooks/useToast';
import { OnboardingProvider } from '../hooks/useOnboarding';
import { GuestPicksProvider } from '../hooks/useGuestPicks';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { ThemeProvider, useTheme } from '../lib/theme';
import { DrawerProvider } from '../lib/DrawerContext';
import { AppDrawer } from '../components/navigation/AppDrawer';
import { AppErrorBoundary } from '../components/ErrorBoundary';
import { initSentry } from '../lib/sentry';
import { NetworkStatusBanner } from '../components/ui';
import { SuperwallProvider } from 'expo-superwall';
import { useUser } from 'expo-superwall';
import { SUPERWALL_API_KEYS } from '../lib/superwall';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

/**
 * Syncs Superwall user identity with auth state.
 * Renders nothing - just runs identify/signOut side effects.
 */
function SuperwallIdentifier() {
  const { user, isGuest } = useAuth();
  const { identify, signOut: swSignOut } = useUser();

  useEffect(() => {
    if (user?.id && !isGuest) {
      identify(user.id);
    } else {
      swSignOut();
    }
  }, [user?.id, isGuest, identify, swSignOut]);

  return null;
}

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
            headerShown: false,
            animation: 'fade',
            animationDuration: 200,
          }}
        />
        <Stack.Screen name="post/notifications" options={{ title: 'Notifications', headerBackTitle: 'Back' }} />
        <Stack.Screen name="post/search" options={{ title: 'Search', headerBackTitle: 'Back' }} />
        <Stack.Screen name="post/create" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="fighter/[id]/index" options={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />
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
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SuperwallProvider apiKeys={SUPERWALL_API_KEYS}>
            <SuperwallIdentifier />
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
          </SuperwallProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
