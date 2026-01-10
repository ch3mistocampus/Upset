/**
 * Onboarding carousel for first-time users
 * Swipeable screens introducing app features
 */

import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { spacing, typography, radius } from '../../lib/tokens';
import { Button } from '../../components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  iconBgColor?: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'flash',
    title: 'Welcome to Upset',
    description: 'The ultimate UFC picks tracker for MMA fans who want to prove their fight IQ.',
  },
  {
    id: '2',
    icon: 'hand-left',
    title: 'Make Your Picks',
    description: 'Predict fight winners before events lock. Choose the fighter and method of victory.',
  },
  {
    id: '3',
    icon: 'stats-chart',
    title: 'Track Your Stats',
    description: 'See your accuracy percentage, win streaks, and performance over time.',
  },
  {
    id: '4',
    icon: 'trophy',
    title: 'Compete & Win',
    description: 'Climb the leaderboards, compete with friends, and prove you know MMA.',
  },
];

export default function Onboarding() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(slideIndex);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      // Last slide - go to welcome
      router.replace('/(auth)/welcome');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/welcome');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.accent + '15' }]}>
          <Ionicons name={item.icon} size={80} color={colors.accent} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {item.title}
        </Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    </View>
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + spacing.md }]}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Pagination dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentIndex ? colors.accent : colors.border,
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Next/Get Started button */}
        <View style={styles.buttonContainer}>
          <Button
            title={isLastSlide ? 'Get Started' : 'Next'}
            onPress={handleNext}
            variant="primary"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    ...typography.body,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  bottomSection: {
    paddingHorizontal: spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    width: '100%',
  },
});
