/**
 * DrawerContext - Global state management for app drawer
 * Supports disabling drawer swipe gestures on deeper screens
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface DrawerContextValue {
  isOpen: boolean;
  isEnabled: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setEnabled: (enabled: boolean) => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

interface DrawerProviderProps {
  children: React.ReactNode;
}

export function DrawerProvider({ children }: DrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  const openDrawer = useCallback(() => {
    if (isEnabled) {
      setIsOpen(true);
    }
  }, [isEnabled]);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    if (isEnabled) {
      setIsOpen((prev) => !prev);
    }
  }, [isEnabled]);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    // Close drawer when disabling
    if (!enabled) {
      setIsOpen(false);
    }
  }, []);

  const value = useMemo<DrawerContextValue>(() => ({
    isOpen,
    isEnabled,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    setEnabled,
  }), [isOpen, isEnabled, openDrawer, closeDrawer, toggleDrawer, setEnabled]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerContextValue {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
}
