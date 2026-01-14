/**
 * CountdownText - Premium countdown display with stable typography
 *
 * Features:
 * - Format: "21d · 23h · 14m" with middle dot separators
 * - Tabular numerals for stable width
 * - Updates at minute boundaries
 * - Muted accent color
 */

import React, { useEffect, useState, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../lib/theme';
import { displayTypography } from '../../lib/tokens';

interface CountdownTextProps {
  /** Target date to count down to */
  targetDate: Date;
  /** Called when countdown reaches zero */
  onComplete?: () => void;
}

export function CountdownText({ targetDate, onComplete }: CountdownTextProps) {
  const { colors } = useTheme();
  const [timeString, setTimeString] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isNearRef = useRef(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeString('Event Started');
        setIsComplete(true);
        onComplete?.();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Check if within 24 hours
      const totalHours = days * 24 + hours;
      const isNear = totalHours < 24;

      // Start pulse animation when near
      if (isNear && !isNearRef.current) {
        isNearRef.current = true;
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.02,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }

      // Format with zero-padded values
      const pad = (n: number) => n.toString().padStart(2, '0');

      if (days > 0) {
        setTimeString(`${days}d · ${pad(hours)}h · ${pad(minutes)}m`);
      } else if (hours > 0) {
        setTimeString(`${hours}h · ${pad(minutes)}m`);
      } else {
        setTimeString(`${minutes}m`);
      }
    };

    // Initial update
    updateCountdown();

    // Update every minute (at minute boundary)
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    // First timeout to sync to minute boundary
    const syncTimeout = setTimeout(() => {
      updateCountdown();
      // Then interval every minute
      const interval = setInterval(updateCountdown, 60000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(syncTimeout);
  }, [targetDate, onComplete, pulseAnim]);

  return (
    <Animated.Text
      style={[
        styles.countdown,
        {
          color: colors.accent,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {timeString}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  countdown: {
    ...displayTypography.countdown,
    textAlign: 'center',
  },
});
