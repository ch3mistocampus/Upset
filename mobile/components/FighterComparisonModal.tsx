/**
 * FighterComparisonModal
 * Full-screen modal for side-by-side fighter stat comparison
 *
 * Features:
 * - Fetches both fighters using useFighter hook
 * - Category toggle chips for filtering stats
 * - Animated stat bars with advantage highlighting
 * - Loading skeleton and error states
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography, shadows } from '../lib/tokens';
import { useFighter } from '../hooks/useFighterStats';
import {
  ComparisonHeader,
  CategoryToggleRow,
  TaleOfTheTape,
  StatCategory,
} from './comparison';

interface FighterComparisonModalProps {
  visible: boolean;
  onClose: () => void;
  redFighterId: string;
  blueFighterId: string;
  redFighterName: string;
  blueFighterName: string;
  weightClass?: string;
}

export function FighterComparisonModal({
  visible,
  onClose,
  redFighterId,
  blueFighterId,
  redFighterName,
  blueFighterName,
  weightClass,
}: FighterComparisonModalProps): React.ReactElement {
  const { colors, isDark, shadows: themeShadows } = useTheme();

  // State
  const [enabledCategories, setEnabledCategories] = useState<Set<StatCategory>>(
    new Set(['physical', 'record', 'striking', 'grappling'])
  );

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Fetch fighter data
  const {
    data: redFighter,
    isLoading: redLoading,
    isError: redError,
  } = useFighter(visible ? redFighterId : null);

  const {
    data: blueFighter,
    isLoading: blueLoading,
    isError: blueError,
  } = useFighter(visible ? blueFighterId : null);

  const isLoading = redLoading || blueLoading;
  const hasError = redError || blueError;

  // Animate modal in/out
  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      backdropAnim.setValue(0);
    }
  }, [visible]);

  // Handle category toggle
  const handleCategoryToggle = (category: StatCategory): void => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        // Don't allow disabling all categories
        if (next.size > 1) {
          next.delete(category);
        }
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Handle close with animation
  const handleClose = (): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Render loading skeleton
  const renderSkeleton = (): React.ReactElement => (
    <View style={styles.skeletonContainer}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading fighter stats...
      </Text>
    </View>
  );

  // Render error state
  const renderError = (): React.ReactElement => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
      <Text style={[styles.errorText, { color: colors.text }]}>
        Failed to load fighter data
      </Text>
      <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
        Check your connection and try again
      </Text>
    </View>
  );

  // Render Tale of the Tape stats
  const renderStats = (): React.ReactElement => {
    if (!redFighter && !blueFighter) {
      return renderError();
    }

    return (
      <ScrollView
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContent}
        showsVerticalScrollIndicator={false}
      >
        <TaleOfTheTape
          redFighter={redFighter}
          blueFighter={blueFighter}
          enabledCategories={enabledCategories}
        />
        {/* Bottom padding */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropAnim },
        ]}
      >
        <Pressable style={styles.backdropPressable} onPress={handleClose} />

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
              ...themeShadows.card,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Fighter Comparison
            </Text>
            <View style={styles.closeButton} />
          </View>

          {/* Fighter Names Header */}
          <ComparisonHeader
            redName={redFighterName}
            blueName={blueFighterName}
            redRanking={redFighter?.ranking}
            blueRanking={blueFighter?.ranking}
            weightClass={weightClass}
          />

          {/* Category Toggle */}
          <CategoryToggleRow
            enabledCategories={enabledCategories}
            onToggle={handleCategoryToggle}
          />

          {/* Stats Content */}
          {isLoading ? renderSkeleton() : hasError ? renderError() : renderStats()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    height: '85%',
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsScroll: {
    flex: 1,
  },
  statsContent: {
    paddingTop: spacing.xs,
  },
  skeletonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.h3,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorSubtext: {
    ...typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
