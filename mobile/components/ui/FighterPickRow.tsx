import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography, displayTypography } from '../../lib/tokens';

interface FighterPickRowProps {
  fighterName: string;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
  result?: 'win' | 'loss' | null;
}

export function FighterPickRow({
  fighterName,
  isSelected,
  onPress,
  disabled = false,
  result,
}: FighterPickRowProps) {
  const { colors, isDark } = useTheme();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const selectionAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkmarkAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevSelected = useRef(isSelected);

  // Animate selection state changes
  useEffect(() => {
    // Skip animation for result states
    if (result) return;

    if (isSelected !== prevSelected.current) {
      prevSelected.current = isSelected;

      if (isSelected) {
        // Selection animation sequence
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Animate background/border transition
        Animated.spring(selectionAnim, {
          toValue: 1,
          useNativeDriver: false,
          tension: 80,
          friction: 8,
        }).start();

        // Checkmark bounce in
        checkmarkAnim.setValue(0);
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
        }).start();

        // Pulse effect
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 100,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.spring(pulseAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start();
      } else {
        // Deselection animation
        Animated.spring(selectionAnim, {
          toValue: 0,
          useNativeDriver: false,
          tension: 80,
          friction: 8,
        }).start();
        checkmarkAnim.setValue(0);
      }
    }
  }, [isSelected, result, selectionAnim, checkmarkAnim, pulseAnim]);

  const handlePressIn = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        tension: 150,
        friction: 5,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 5,
    }).start();
  };

  const handlePress = () => {
    if (!disabled) {
      onPress();
    }
  };

  // Interpolate colors based on selection state
  const backgroundColor = result
    ? (result === 'win' ? (isDark ? colors.successSoft : '#E8F5ED') : (isDark ? colors.dangerSoft : '#FBEAEC'))
    : selectionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.surfaceAlt, colors.accentSoft],
      });

  const borderColor = result
    ? (result === 'win' ? colors.success : colors.danger)
    : selectionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.accent],
      });

  // Checkmark scale animation
  const checkmarkScale = checkmarkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.3, 1],
  });

  const getTextColor = () => {
    if (disabled) return colors.textTertiary;
    return colors.textPrimary;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }, { scale: pulseAnim }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            styles.row,
            {
              backgroundColor,
              borderColor,
              opacity: disabled ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={[styles.fighterName, { color: getTextColor() }]}
            numberOfLines={1}
          >
            {fighterName}
          </Text>

          {isSelected && !result && (
            <Animated.View
              style={[
                styles.checkContainer,
                { backgroundColor: colors.accent, transform: [{ scale: checkmarkScale }] },
              ]}
            >
              <Ionicons name="checkmark" size={14} color={colors.onAccent} />
            </Animated.View>
          )}

          {result === 'win' && (
            <View style={[styles.resultBadge, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}

          {result === 'loss' && (
            <View style={[styles.resultBadge, { backgroundColor: colors.danger }]}>
              <Ionicons name="close" size={12} color="#fff" />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 54,
    borderRadius: radius.input,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fighterName: {
    ...displayTypography.fighterName,
    flex: 1,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
