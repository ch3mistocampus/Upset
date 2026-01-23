import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { theme, shadows, fontFamily } from './theme';
import { scaled, scaledFont } from './layout';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  scale?: number;
}

export const Card: React.FC<CardProps> = ({ children, style, scale = 1 }) => (
  <div
    style={{
      backgroundColor: theme.colors.card,
      borderRadius: scaled(theme.radii.lg, scale),
      boxShadow: shadows.card,
      padding: scaled(24, scale),
      ...style,
    }}
  >
    {children}
  </div>
);

interface PillProps {
  children: React.ReactNode;
  variant: 'red' | 'blue' | 'muted';
  scale?: number;
  style?: React.CSSProperties;
}

export const Pill: React.FC<PillProps> = ({ children, variant, scale = 1, style }) => {
  const bgColors = {
    red: 'rgba(209, 27, 42, 0.12)',
    blue: 'rgba(29, 78, 216, 0.12)',
    muted: 'rgba(107, 107, 115, 0.12)',
  };
  const textColors = {
    red: theme.colors.accent,
    blue: theme.colors.blue,
    muted: theme.colors.muted,
  };

  return (
    <div
      style={{
        backgroundColor: bgColors[variant],
        color: textColors[variant],
        borderRadius: scaled(theme.radii.full, scale),
        padding: `${scaled(10, scale)}px ${scaled(20, scale)}px`,
        fontSize: scaledFont(16, scale),
        fontFamily: fontFamily.body,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        display: 'inline-flex',
        alignItems: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface ButtonProps {
  children: React.ReactNode;
  scale?: number;
  pulse?: boolean;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({ children, scale = 1, pulse = false, style }) => {
  const frame = useCurrentFrame();
  const pulseScale = pulse
    ? interpolate(frame % 40, [0, 20, 40], [1, 1.04, 1])
    : 1;

  return (
    <div
      style={{
        backgroundColor: theme.colors.accent,
        color: '#FFFFFF',
        borderRadius: scaled(theme.radii.lg, scale),
        padding: `${scaled(24, scale)}px ${scaled(56, scale)}px`,
        fontSize: scaledFont(28, scale),
        fontFamily: fontFamily.display,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '-0.01em',
        boxShadow: shadows.button,
        transform: `scale(${pulseScale})`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'accent';
  scale?: number;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'success',
  scale = 1,
  style
}) => {
  const bgColor = variant === 'success' ? '#22C55E' : theme.colors.accent;

  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: '#FFFFFF',
        borderRadius: scaled(theme.radii.md, scale),
        padding: `${scaled(8, scale)}px ${scaled(18, scale)}px`,
        fontSize: scaledFont(18, scale),
        fontFamily: fontFamily.body,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: scaled(6, scale),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface DividerProps {
  scale?: number;
  style?: React.CSSProperties;
}

export const Divider: React.FC<DividerProps> = ({ scale = 1, style }) => (
  <div
    style={{
      height: 1,
      backgroundColor: theme.colors.muted,
      opacity: 0.2,
      width: '100%',
      ...style,
    }}
  />
);

interface TitleTextProps {
  children: React.ReactNode;
  size?: number;
  scale?: number;
  color?: string;
  style?: React.CSSProperties;
}

export const TitleText: React.FC<TitleTextProps> = ({
  children,
  size = 48,
  scale = 1,
  color = theme.colors.text,
  style,
}) => (
  <div
    style={{
      fontFamily: fontFamily.display,
      fontSize: scaledFont(size, scale),
      fontWeight: 800,
      color,
      textTransform: 'uppercase',
      letterSpacing: '-0.03em',
      lineHeight: 1.1,
      ...style,
    }}
  >
    {children}
  </div>
);

interface BodyTextProps {
  children: React.ReactNode;
  size?: number;
  scale?: number;
  color?: string;
  style?: React.CSSProperties;
}

export const BodyText: React.FC<BodyTextProps> = ({
  children,
  size = 16,
  scale = 1,
  color = theme.colors.text,
  style,
}) => (
  <div
    style={{
      fontFamily: fontFamily.body,
      fontSize: scaledFont(size, scale),
      fontWeight: 400,
      color,
      letterSpacing: '0.005em',
      lineHeight: 1.5,
      ...style,
    }}
  >
    {children}
  </div>
);
