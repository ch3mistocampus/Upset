// Design system theme tokens
export const theme = {
  colors: {
    bg: '#F7F7F8',
    card: '#FFFFFF',
    text: '#141416',
    muted: '#6B6B73',
    accent: '#D11B2A',
    accentDark: '#B01522',
    blue: '#1D4ED8',
    red: '#D11B2A',
    shadow: 'rgba(0, 0, 0, 0.10)',
    shadowStrong: 'rgba(0, 0, 0, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.03)',
  },
  radii: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 28,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    // Condensed title style
    title: {
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '-0.03em',
    },
    // Body text style
    body: {
      fontWeight: 400,
      letterSpacing: '0.005em',
    },
    // Label style
    label: {
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
    },
  },
} as const;

// Font family (using system fonts with fallbacks for condensed look)
export const fontFamily = {
  display: '"Inter Tight", "SF Pro Display", -apple-system, system-ui, sans-serif',
  body: '"Inter", "SF Pro Text", -apple-system, system-ui, sans-serif',
};

// Shadow presets
export const shadows = {
  card: `0 4px 24px ${theme.colors.shadow}, 0 1px 4px ${theme.colors.shadow}`,
  cardHover: `0 8px 32px ${theme.colors.shadowStrong}, 0 2px 8px ${theme.colors.shadow}`,
  button: `0 4px 16px rgba(209, 27, 42, 0.25)`,
  buttonHover: `0 6px 24px rgba(209, 27, 42, 0.35)`,
};
