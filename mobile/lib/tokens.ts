// Design Tokens for UFC Picks Tracker
// Light mode is the default brand experience

export const colors = {
  light: {
    // Backgrounds & Surfaces
    background: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF0F3',
    border: '#E2E5EA',
    divider: '#E7EAF0',

    // Text
    text: '#111318',
    textPrimary: '#111318',
    textSecondary: '#5E6470',
    textTertiary: '#8A90A0',
    textMuted: '#8A90A0',

    // UFC Red Accent
    accent: '#B01E28',
    accentHover: '#9A1A23',
    accentSoft: '#F4D7DA',
    accentSoft2: '#FBEAEC',
    onAccent: '#FFFFFF',

    // Semantic
    success: '#1F7A3D',
    successSoft: '#E8F5ED',
    warning: '#C97B12',
    warningSoft: '#FEF3E2',
    danger: '#B01E28',
    dangerSoft: '#FBEAEC',

    // Tab Bar
    tabInactive: '#8A90A0',
    tabActive: '#B01E28',

    // Skeleton
    skeleton: '#E2E5EA',

    // Shadow
    shadowColor: 'rgba(0, 0, 0, 0.08)',
  },

  dark: {
    // Backgrounds & Surfaces
    background: '#0C0E12',
    surface: '#12151B',
    surfaceAlt: '#1A1F27',
    border: '#242A35',
    divider: '#1F2530',

    // Text
    text: '#F3F5F8',
    textPrimary: '#F3F5F8',
    textSecondary: '#B6BCC8',
    textTertiary: '#7F8796',
    textMuted: '#7F8796',

    // UFC Red Accent (slightly brighter for dark mode)
    accent: '#E03A43',
    accentHover: '#C8333B',
    accentSoft: '#3A1A1D',
    accentSoft2: '#251316',
    onAccent: '#FFFFFF',

    // Semantic
    success: '#34D399',
    successSoft: '#1A2F25',
    warning: '#FBBF24',
    warningSoft: '#2F2A1A',
    danger: '#E03A43',
    dangerSoft: '#3A1A1D',

    // Tab Bar
    tabInactive: '#7F8796',
    tabActive: '#E03A43',

    // Skeleton
    skeleton: '#242A35',

    // Shadow
    shadowColor: 'rgba(0, 0, 0, 0.35)',
  },
} as const;

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
  },
  h3: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  meta: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  card: 18,
  button: 14,
  pill: 999,
  input: 12,
  sm: 8,
} as const;

export const shadows = {
  light: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 8,
    },
  },
  dark: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 26,
      elevation: 10,
    },
  },
} as const;

// Fighter corner colors (for pick screens)
export const fighterColors = {
  red: {
    light: { bg: '#FBEAEC', border: '#E8B4B9', text: '#9A1A23' },
    dark: { bg: '#3A1A1D', border: '#5A2A2D', text: '#F4D7DA' },
  },
  blue: {
    light: { bg: '#E8F0FE', border: '#B4C9E8', text: '#1A4A9A' },
    dark: { bg: '#1A1D3A', border: '#2A3D5A', text: '#B4C9E8' },
  },
} as const;

export type ThemeColors = typeof colors.light;
export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
