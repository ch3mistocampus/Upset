/**
 * DrawerContext - Global state management for app drawer
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface DrawerContextValue {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

interface DrawerProviderProps {
  children: React.ReactNode;
}

export function DrawerProvider({ children }: DrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const value = useMemo<DrawerContextValue>(() => ({
    isOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  }), [isOpen, openDrawer, closeDrawer, toggleDrawer]);

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
