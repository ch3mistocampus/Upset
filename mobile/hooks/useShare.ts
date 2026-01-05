/**
 * useShare Hook
 *
 * Share picks and achievements to other apps.
 * Uses expo-sharing for native share sheet.
 */

import { Share, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface SharePicksOptions {
  eventName: string;
  correctCount: number;
  totalCount: number;
  accuracy: number;
}

interface ShareAchievementOptions {
  type: 'streak' | 'accuracy' | 'event_winner';
  value: number;
  eventName?: string;
}

interface ShareProfileOptions {
  username: string;
  accuracy: number;
  totalPicks: number;
}

/**
 * Generate share message for picks results
 */
function generatePicksMessage(options: SharePicksOptions): string {
  const { eventName, correctCount, totalCount, accuracy } = options;
  return `I got ${correctCount}/${totalCount} picks correct (${accuracy}%) at ${eventName}! 🥊\n\nMake your UFC predictions on UFC Picks Tracker!`;
}

/**
 * Generate share message for achievements
 */
function generateAchievementMessage(options: ShareAchievementOptions): string {
  const { type, value, eventName } = options;

  switch (type) {
    case 'streak':
      return `🔥 I'm on a ${value}-pick winning streak on UFC Picks Tracker!\n\nCan you beat my streak? Download the app and find out!`;
    case 'accuracy':
      return `🎯 I've achieved ${value}% accuracy on UFC Picks Tracker!\n\nThink you can predict better? Download the app!`;
    case 'event_winner':
      return `🏆 I was the top predictor at ${eventName}!\n\nChallenge me on UFC Picks Tracker!`;
    default:
      return 'Check out UFC Picks Tracker!';
  }
}

/**
 * Generate share message for profile
 */
function generateProfileMessage(options: ShareProfileOptions): string {
  const { username, accuracy, totalPicks } = options;
  return `Check out my UFC Picks profile! @${username}\n\n📊 ${accuracy.toFixed(1)}% accuracy across ${totalPicks} picks\n\nMake your predictions on UFC Picks Tracker!`;
}

/**
 * Hook for sharing content
 */
export function useShare() {
  const sharePicks = async (options: SharePicksOptions) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const message = generatePicksMessage(options);

      const result = await Share.share({
        message,
        // URL could be added here for deep linking when we have web version
        // url: `https://ufcpicks.app/event/${eventId}`,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error sharing picks:', error);
      return false;
    }
  };

  const shareAchievement = async (options: ShareAchievementOptions) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const message = generateAchievementMessage(options);

      const result = await Share.share({ message });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error sharing achievement:', error);
      return false;
    }
  };

  const shareProfile = async (options: ShareProfileOptions) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const message = generateProfileMessage(options);

      const result = await Share.share({ message });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error sharing profile:', error);
      return false;
    }
  };

  const shareCustom = async (message: string, title?: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await Share.share({
        message,
        title: title || 'UFC Picks Tracker',
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error sharing:', error);
      return false;
    }
  };

  return {
    sharePicks,
    shareAchievement,
    shareProfile,
    shareCustom,
  };
}
