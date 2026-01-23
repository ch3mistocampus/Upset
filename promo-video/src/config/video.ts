// Video configuration constants
export const VIDEO_CONFIG = {
  fps: 30,
  durationInFrames: 480, // ~16 seconds
  portrait: {
    width: 1080,
    height: 1920,
  },
  landscape: {
    width: 1920,
    height: 1080,
  },
} as const;

// Timeline boundaries (frame ranges for each scene)
// Flow: Hook → Fight Card → Fighter Stats → App Showcase → CTA
export const TIMELINE = {
  scene1: { start: 0, end: 60 },          // 0-2s: Hook (octagon + UPSET)
  scene2: { start: 60, end: 150 },        // 2-5s: Fight Card + "Make Your Picks"
  sceneFighterStats: { start: 150, end: 240 }, // 5-8s: Fighter Stats Comparison
  scene3: { start: 240, end: 390 },       // 8-13s: App Showcase (4 screens)
  scene4: { start: 390, end: 480 },       // 13-16s: Waitlist CTA
} as const;

// Type definitions
export type UpsetFormat = 'portrait' | 'landscape';

export interface UpsetPromoProps {
  format: UpsetFormat;
}

export interface SceneProps {
  start: number;
  end: number;
  format: UpsetFormat;
  scale: number;
}

// Helper to calculate scale factor based on width
// Using a smaller base to make everything larger
export const getScaleFactor = (width: number): number => {
  const baseWidth = 720; // Smaller base = larger elements
  return width / baseWidth;
};

// Safe margin percentage (6% on each side)
export const SAFE_MARGIN_PERCENT = 0.06;

export const getSafeMargin = (width: number): number => {
  return width * SAFE_MARGIN_PERCENT;
};
