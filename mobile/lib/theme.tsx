import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadows, type ThemeColors, type ThemeMode, type ResolvedTheme } from './tokens';
import { logger } from './logger';

const THEME_STORAGE_KEY = '@ufc_picks_theme_mode';

interface ThemeContextValue {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: ThemeColors;
  shadows: typeof shadows.light;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted theme preference on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && ['system', 'light', 'dark'].includes(stored)) {
          setThemeModeState(stored as ThemeMode);
          logger.debug('Theme loaded from storage', { themeMode: stored });
        }
      } catch (error) {
        logger.warn('Failed to load theme preference', { error });
      } finally {
        setIsLoaded(true);
      }
    }
    loadTheme();
  }, []);

  // Log theme on app start
  useEffect(() => {
    if (isLoaded) {
      const resolved = themeMode === 'system'
        ? (systemColorScheme === 'dark' ? 'dark' : 'light')
        : themeMode;
      logger.info('Theme initialized', { themeMode, resolvedTheme: resolved });
    }
  }, [isLoaded, themeMode, systemColorScheme]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      logger.info('Theme preference changed', { themeMode: mode });
    } catch (error) {
      logger.warn('Failed to persist theme preference', { error });
    }
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    themeMode,
    resolvedTheme,
    colors: colors[resolvedTheme],
    shadows: shadows[resolvedTheme],
    isDark: resolvedTheme === 'dark',
    setThemeMode,
  }), [themeMode, resolvedTheme, setThemeMode]);

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Convenience hook for just the resolved theme
export function useResolvedTheme(): ResolvedTheme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme;
}

// Helper hook for creating themed styles
export function useThemedStyles<T>(
  styleFactory: (theme: ThemeContextValue) => T
): T {
  const theme = useTheme();
  return useMemo(() => styleFactory(theme), [theme, styleFactory]);
}
