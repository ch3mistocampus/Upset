/**
 * Onboarding carousel for first-time users
 * Clean, bold light mode design
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../lib/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Clean light mode colors
const COLORS = {
  background: '#FFFFFF',
  accent: '#B0443F',
  textPrimary: '#111215',
  textSecondary: 'rgba(18, 19, 24, 0.6)',
  textMuted: 'rgba(18, 19, 24, 0.4)',
  border: '#E8EAED',
};

interface OnboardingSlide {
  id: string;
  step?: string;
  title: string;
  highlight: string;
  subtitle: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Welcome to',
    highlight: 'UPSET',
    subtitle: 'Where chaos proves who\'s right.',
  },
  {
    id: '2',
    step: '01',
    title: 'Call the',
    highlight: 'FIGHT',
    subtitle: 'Pick your winner before the cage door closes.',
  },
  {
    id: '3',
    step: '02',
    title: 'Own the',
    highlight: 'OUTCOME',
    subtitle: 'Track your accuracy. Build your streak.',
  },
  {
    id: '4',
    step: '03',
    title: 'Prove you\'re',
    highlight: 'RIGHT',
    subtitle: 'Every fight is an upset waiting to happen.',
  },
];

function SlideContent({ item }: { item: OnboardingSlide }) {
  return (
    <View style={styles.slideContent}>
      {/* Step indicator */}
      {item.step && (
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{item.step}</Text>
        </View>
      )}

      {/* Title */}
      <Text style={styles.title}>{item.title}</Text>

      {/* Highlighted word */}
      <Text style={styles.highlight}>{item.highlight}</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );
}

export default function Onboarding() {
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
      router.replace('/(auth)/welcome');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/welcome');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <SlideContent item={item} />
    </View>
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft} />
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

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
        {/* Pagination */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>
            {isLastSlide ? 'Get Started' : 'Continue'}
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  headerLeft: {
    width: 40,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  stepText: {
    fontFamily: 'BebasNeue',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  highlight: {
    fontFamily: 'BebasNeue',
    fontSize: 72,
    color: COLORS.textPrimary,
    letterSpacing: -2,
    lineHeight: 76,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.lg,
    maxWidth: 280,
  },
  bottomSection: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.accent,
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
});
