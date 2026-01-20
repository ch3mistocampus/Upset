/**
 * Grace Period Timer
 *
 * Displays a countdown timer for the scoring grace period.
 * Shows urgency indicators as time runs low.
 */

import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';
import * as Haptics from 'expo-haptics';

interface GracePeriodTimerProps {
  /** When the scoring window ends (ISO string or Date) */
  endsAt: string | Date | null;
  /** Grace period in seconds (default: 90) */
  graceSeconds?: number;
  /** Callback when timer expires */
  onExpire?: () => void;
  /** Compact display mode */
  compact?: boolean;
}

export function GracePeriodTimer({
  endsAt,
  graceSeconds = 90,
  onExpire,
  compact = false,
}: GracePeriodTimerProps) {
  const { colors } = useTheme();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasExpired, setHasExpired] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lastHapticTime = useRef<number>(0);

  // Calculate end time including grace period
  useEffect(() => {
    if (!endsAt) {
      setTimeLeft(null);
      return;
    }

    const endTime = new Date(endsAt).getTime() + graceSeconds * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && !hasExpired) {
        setHasExpired(true);
        onExpire?.();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      // Haptic feedback at key moments
      if (remaining > 0 && remaining <= 10 && now - lastHapticTime.current > 1000) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        lastHapticTime.current = now;
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endsAt, graceSeconds, hasExpired, onExpire]);

  // Pulse animation for urgency
  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 10 && timeLeft > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timeLeft]);

  if (timeLeft === null) {
    return null;
  }

  // Determine color based on time remaining
  let timerColor: string = colors.success;
  let urgencyLevel: 'normal' | 'warning' | 'critical' = 'normal';

  if (timeLeft <= 10) {
    timerColor = colors.danger;
    urgencyLevel = 'critical';
  } else if (timeLeft <= 30) {
    timerColor = colors.warning;
    urgencyLevel = 'warning';
  }

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          { backgroundColor: timerColor + '20', transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Ionicons name="time-outline" size={12} color={timerColor} />
        <Text style={[styles.compactText, { color: timerColor }]}>{formattedTime}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: timerColor + '15', borderColor: timerColor, transform: [{ scale: pulseAnim }] },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={urgencyLevel === 'critical' ? 'alarm' : 'time-outline'}
          size={20}
          color={timerColor}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {hasExpired ? 'Scoring window closed' : 'Time to submit'}
        </Text>
        <Text style={[styles.time, { color: timerColor }]}>
          {hasExpired ? 'Expired' : formattedTime}
        </Text>
      </View>
      {urgencyLevel === 'critical' && !hasExpired && (
        <View style={[styles.urgencyBadge, { backgroundColor: timerColor }]}>
          <Text style={styles.urgencyText}>HURRY!</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  time: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  urgencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

export default GracePeriodTimer;
