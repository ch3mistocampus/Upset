/**
 * Welcome screen for first-time users
 * Clean light mode design matching onboarding
 */

import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { spacing } from '../../lib/tokens';

// Clean light mode colors
const COLORS = {
  background: '#FFFFFF',
  accent: '#B0443F',
  textPrimary: '#111215',
  textSecondary: 'rgba(18, 19, 24, 0.6)',
  textMuted: 'rgba(18, 19, 24, 0.4)',
  border: '#E8EAED',
  featureBg: '#F8F9FA',
};

const FEATURES = [
  { icon: 'flash-outline' as const, text: 'Pick winners before the cage closes' },
  { icon: 'analytics-outline' as const, text: 'Track your accuracy and streaks' },
  { icon: 'trophy-outline' as const, text: 'Compete on the leaderboards' },
];

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { enterGuestMode, markFirstLaunchComplete } = useAuth();

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    featureAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }, 250 + index * 80);
    });
  }, [fadeAnim, slideAnim, featureAnims]);

  const handleGetStarted = async () => {
    await enterGuestMode();
    router.replace('/(tabs)/home');
  };

  const handleSignIn = async () => {
    await markFirstLaunchComplete();
    router.push('/(auth)/sign-in');
  };

  return (
    <View style={styles.container}>
      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + spacing.xxl }]}>
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Title */}
          <Text style={styles.title}>You're ready</Text>
          <Text style={styles.highlight}>LET'S GO</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Every fight is an upset waiting to happen.
          </Text>
        </Animated.View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((feature, index) => (
            <Animated.View
              key={index}
              style={[
                styles.featureItem,
                {
                  opacity: featureAnims[index],
                  transform: [
                    {
                      translateY: featureAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={20} color={COLORS.accent} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </TouchableOpacity>

        {/* Secondary CTA */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSignIn}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryText}>I have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  highlight: {
    fontFamily: 'BebasNeue',
    fontSize: 72,
    color: COLORS.textPrimary,
    letterSpacing: -2,
    lineHeight: 76,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.lg,
  },
  features: {
    marginTop: spacing.xxl + spacing.lg,
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: COLORS.featureBg,
    borderRadius: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(176, 68, 63, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'BebasNeue',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
});
