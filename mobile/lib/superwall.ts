/**
 * Superwall configuration constants
 * Product IDs, placement identifiers, and free tier limits
 */

// API Keys (from environment)
export const SUPERWALL_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY || '',
};

// Check if Superwall is properly configured (key exists and is non-empty)
export const IS_SUPERWALL_CONFIGURED = Boolean(process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY);

// App Store product identifiers
export const PRODUCT_IDS = {
  MONTHLY: 'com.getupset.app.pro.monthly',
  YEARLY: 'com.getupset.app.pro.yearly',
} as const;

// Superwall placement identifiers (configured in dashboard)
export const PLACEMENTS = {
  EVENT_LIMIT_REACHED: 'event_limit_reached',
  POST_LIMIT_REACHED: 'post_limit_reached',
  IMAGE_ATTACHMENT: 'image_attachment',
  APP_OPEN: 'app_open',
  MILESTONE_NUDGE: 'milestone_nudge',
} as const;

// Free tier usage limits
export const FREE_LIMITS = {
  EVENTS_PICKED: 2,
  POSTS_CREATED: 5,
} as const;

// Soft paywall session config
export const SESSION_CONFIG = {
  FIRST_SOFT_PAYWALL: 5,
  REPEAT_INTERVAL: 10,
} as const;
