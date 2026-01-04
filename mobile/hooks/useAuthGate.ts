/**
 * Auth gate hook for soft authentication prompts
 * Shows modals when guests try to access protected features
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { AuthContext } from '../components/AuthPromptModal';

interface UseAuthGateResult {
  /** Whether the gate modal is currently shown */
  showGate: boolean;
  /** The context for the current gate */
  gateContext: AuthContext | null;
  /** Open the gate modal with a specific context */
  openGate: (context: AuthContext) => void;
  /** Close the gate modal */
  closeGate: () => void;
  /** Check if user is authorized, opens gate if not. Returns true if allowed */
  checkAuth: (context: AuthContext) => boolean;
  /** Whether user is in guest mode */
  isGuest: boolean;
}

export function useAuthGate(): UseAuthGateResult {
  const { isGuest } = useAuth();
  const [showGate, setShowGate] = useState(false);
  const [gateContext, setGateContext] = useState<AuthContext | null>(null);

  const openGate = useCallback((context: AuthContext) => {
    setGateContext(context);
    setShowGate(true);
  }, []);

  const closeGate = useCallback(() => {
    setShowGate(false);
    // Keep context for animation
    setTimeout(() => setGateContext(null), 300);
  }, []);

  const checkAuth = useCallback((context: AuthContext): boolean => {
    if (isGuest) {
      openGate(context);
      return false;
    }
    return true;
  }, [isGuest, openGate]);

  return {
    showGate,
    gateContext,
    openGate,
    closeGate,
    checkAuth,
    isGuest,
  };
}
