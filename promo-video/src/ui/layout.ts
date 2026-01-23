import { UpsetFormat, SAFE_MARGIN_PERCENT } from '../config/video';

// Layout helpers for responsive design
export interface LayoutConfig {
  width: number;
  height: number;
  scale: number;
  safeMargin: number;
  contentWidth: number;
  isPortrait: boolean;
}

export const getLayoutConfig = (
  width: number,
  height: number,
  format: UpsetFormat
): LayoutConfig => {
  const baseWidth = 1080;
  const scale = width / baseWidth;
  const safeMargin = width * SAFE_MARGIN_PERCENT;
  const contentWidth = width - safeMargin * 2;
  const isPortrait = format === 'portrait';

  return {
    width,
    height,
    scale,
    safeMargin,
    contentWidth,
    isPortrait,
  };
};

// Scaled value helper
export const scaled = (value: number, scale: number): number => {
  return Math.round(value * scale);
};

// Font size helper with minimum
export const scaledFont = (
  baseSize: number,
  scale: number,
  min: number = 12
): number => {
  return Math.max(min, Math.round(baseSize * scale));
};

// Center content helper
export const centerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
} as const;

// Safe area container style
export const safeAreaStyle = (safeMargin: number) => ({
  position: 'absolute' as const,
  top: safeMargin,
  left: safeMargin,
  right: safeMargin,
  bottom: safeMargin,
});
