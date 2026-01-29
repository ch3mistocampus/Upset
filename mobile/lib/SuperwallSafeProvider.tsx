/**
 * Safe Superwall provider that handles missing API keys gracefully
 * Provides mock context values when Superwall is not configured
 */

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { SuperwallProvider, useUser, usePlacement } from 'expo-superwall';
import { SUPERWALL_API_KEYS, IS_SUPERWALL_CONFIGURED } from './superwall';

// Use 'any' for Superwall types to avoid version coupling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubscriptionStatus = any;

interface RegisterPlacementParams {
  placement: string;
  params?: Record<string, string>;
  feature?: () => void;
}

interface SuperwallContextType {
  isAvailable: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  setSubscriptionStatus: (status: SubscriptionStatus) => void;
  identify: (userId: string) => void;
  signOut: () => void;
  registerPlacement: (params: RegisterPlacementParams) => Promise<void>;
}

const SuperwallContext = createContext<SuperwallContextType | null>(null);

// Inner provider that uses real expo-superwall hooks
function RealSuperwallBridge({ children }: { children: ReactNode }) {
  const { subscriptionStatus, setSubscriptionStatus, identify, signOut } = useUser();
  const { registerPlacement } = usePlacement({
    onDismiss: () => {
      // Handled by consumer if needed
    },
  });

  return (
    <SuperwallContext.Provider
      value={{
        isAvailable: true,
        subscriptionStatus,
        setSubscriptionStatus,
        identify,
        signOut,
        registerPlacement: async (params: RegisterPlacementParams) => {
          await registerPlacement({
            placement: params.placement,
            params: params.params,
            feature: params.feature,
          });
        },
      }}
    >
      {children}
    </SuperwallContext.Provider>
  );
}

// Mock provider when Superwall is not configured
function MockSuperwallProvider({ children }: { children: ReactNode }) {
  const noopSetSubscriptionStatus = useCallback(() => {}, []);
  const noopIdentify = useCallback(() => {}, []);
  const noopSignOut = useCallback(() => {}, []);
  const noopRegisterPlacement = useCallback(async (params: RegisterPlacementParams) => {
    // When Superwall is not available, just call the feature callback directly
    // This allows users to access features without paywall in builds without the key
    if (params.feature) {
      params.feature();
    }
  }, []);

  return (
    <SuperwallContext.Provider
      value={{
        isAvailable: false,
        subscriptionStatus: null,
        setSubscriptionStatus: noopSetSubscriptionStatus,
        identify: noopIdentify,
        signOut: noopSignOut,
        registerPlacement: noopRegisterPlacement,
      }}
    >
      {children}
    </SuperwallContext.Provider>
  );
}

// Main provider that chooses real or mock based on configuration
export function SuperwallSafeProvider({ children }: { children: ReactNode }) {
  if (!IS_SUPERWALL_CONFIGURED) {
    console.warn('[Superwall] API key not configured - running without paywall functionality');
    return <MockSuperwallProvider>{children}</MockSuperwallProvider>;
  }

  return (
    <SuperwallProvider apiKeys={SUPERWALL_API_KEYS}>
      <RealSuperwallBridge>{children}</RealSuperwallBridge>
    </SuperwallProvider>
  );
}

// Hook to access safe Superwall context
export function useSafeSuperwallContext(): SuperwallContextType {
  const context = useContext(SuperwallContext);
  if (!context) {
    throw new Error('useSafeSuperwallContext must be used within SuperwallSafeProvider');
  }
  return context;
}
