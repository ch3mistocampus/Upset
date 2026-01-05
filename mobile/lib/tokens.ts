// Design Tokens for UFC Picks Tracker
// Premium "Muted Red Accent" design system

export const colors = {
  light: {
    // Canvas & Surfaces - neutral, no warmth
    background: '#F5F6F8',
    canvasBg: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F4F6',
    border: '#E8EAED',
    divider: 'rgba(18, 19, 24, 0.08)',

    // Text hierarchy - refined contrast
    text: '#121318',
    textPrimary: '#111215',
    textSecondary: 'rgba(18, 19, 24, 0.58)',
    textTertiary: 'rgba(18, 19, 24, 0.36)',
    textMuted: 'rgba(18, 19, 24, 0.36)',

    // Premium Red Accent (muted, sophisticated)
    accent: '#B0443F',
    accentMuted: '#B0443F',
    accentHover: '#9A3A36',
    accentSoft: '#F4D7DA',
    accentSoft2: '#FBEAEC',
    onAccent: '#FFFFFF',

    // CTA gradient - rich maroon with clarity
    ctaGradientTop: '#B54248',
    ctaGradientBottom: '#943538',

    // Card gradients
    cardBaseTop: '#FFFFFF',
    cardBaseBottom: '#F2F3F5',
    cardWashA: 'rgba(176, 68, 63, 0.12)',
    cardWashB: 'rgba(176, 68, 63, 0.00)',

    // Semantic
    success: '#1F7A3D',
    successSoft: '#E8F5ED',
    warning: '#C97B12',
    warningSoft: '#FEF3E2',
    danger: '#B0443F',
    dangerSoft: '#FBEAEC',

    // Tab Bar
    tabInactive: '#8A90A0',
    tabActive: '#B0443F',

    // Skeleton
    skeleton: '#E8EAED',

    // Shadow
    shadowColor: 'rgba(0, 0, 0, 0.08)',

    // Medal colors for leaderboard
    gold: '#D4A017',
    silver: '#71757E',
    bronze: '#9D6739',
  },

  dark: {
    // Canvas & Surfaces
    background: '#0C0E12',
    canvasBg: '#0C0E12',
    surface: '#12151B',
    surfaceAlt: '#1A1F27',
    border: '#242A35',
    divider: 'rgba(255, 255, 255, 0.08)',

    // Text hierarchy
    text: '#F3F5F8',
    textPrimary: '#F3F5F8',
    textSecondary: 'rgba(243, 245, 248, 0.72)',
    textTertiary: 'rgba(243, 245, 248, 0.48)',
    textMuted: 'rgba(243, 245, 248, 0.48)',

    // Premium Red Accent (brighter for dark mode)
    accent: '#E05A55',
    accentMuted: '#E05A55',
    accentHover: '#C8504B',
    accentSoft: '#3A1A1D',
    accentSoft2: '#251316',
    onAccent: '#FFFFFF',

    // CTA gradient - rich maroon for dark mode
    ctaGradientTop: '#C54A50',
    ctaGradientBottom: '#A53D42',

    // Card gradients
    cardBaseTop: '#1A1F27',
    cardBaseBottom: '#12151B',
    cardWashA: 'rgba(224, 90, 85, 0.15)',
    cardWashB: 'rgba(224, 90, 85, 0.00)',

    // Semantic
    success: '#34D399',
    successSoft: '#1A2F25',
    warning: '#FBBF24',
    warningSoft: '#2F2A1A',
    danger: '#E05A55',
    dangerSoft: '#3A1A1D',

    // Tab Bar
    tabInactive: '#7F8796',
    tabActive: '#E05A55',

    // Skeleton
    skeleton: '#242A35',

    // Shadow
    shadowColor: 'rgba(0, 0, 0, 0.45)',

    // Medal colors for leaderboard
    gold: '#FFD700',
    silver: '#A8B0BC',
    bronze: '#CD853F',
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
  card: 22,
  button: 18,
  pill: 999,
  input: 12,
  sm: 8,
} as const;

export const shadows = {
  light: {
    card: {
      // Pronounced shadow for floating card depth
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.15,
      shadowRadius: 32,
      elevation: 12,
    },
    button: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 5,
    },
  },
  dark: {
    card: {
      // Deeper shadow for dark mode depth
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.40,
      shadowRadius: 28,
      elevation: 10,
    },
    button: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.30,
      shadowRadius: 16,
      elevation: 6,
    },
  },
} as const;

// Fighter corner colors (for pick screens) - maroon red, navy blue
export const fighterColors = {
  red: {
    solid: { light: '#943538', dark: '#C54A50' },
    light: { bg: '#FBEAEC', border: '#D4A5A8', text: '#943538' },
    dark: { bg: '#3A1A1D', border: '#5A2A2D', text: '#E8C5C7' },
  },
  blue: {
    solid: { light: '#1E3A5F', dark: '#4A6FA5' },
    light: { bg: '#E8EEF5', border: '#A8BDD4', text: '#1E3A5F' },
    dark: { bg: '#1A1D2A', border: '#2A3D5A', text: '#B4C9E8' },
  },
} as const;

// Gradient configuration for enhanced cards
export const gradients = {
  cardWash: {
    light: { alpha: 0.18 }, // Increased from 0.10
    dark: { alpha: 0.15 },
  },
  heroGlow: {
    light: { outer: 0.08, inner: 0.22 },
    dark: { outer: 0.06, inner: 0.18 },
  },
  glass: {
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      border: 'rgba(255, 255, 255, 0.4)',
    },
    dark: {
      background: 'rgba(30, 30, 30, 0.65)',
      border: 'rgba(255, 255, 255, 0.08)',
    },
  },
} as const;

export type ThemeColors = typeof colors.light;
export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
