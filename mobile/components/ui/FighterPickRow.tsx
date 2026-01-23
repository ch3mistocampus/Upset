/**
 * FighterPickRow - Interactive fighter selection row
 *
 * Design: 54px+ height row with fighter name (BebasNeue) and record.
 * When selected, shows method of victory prediction inline with record.
 * Shows checkmark when selected, community pick percentage when unselected.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, displayTypography } from '../../lib/tokens';

// Design tokens
const COLORS = {
  accent: '#B0443F',
  accentSoft: '#F4D7DA',
  textPrimary: '#121318',
  surface: '#FFFFFF',
  unselectedBg: '#F9FAFB',
  border: '#E8EAED',
  // Corner colors - UFC style
  redCorner: '#943538',
  redCornerSoft: 'rgba(148, 53, 56, 0.12)',
  blueCorner: '#1E3A5F',
  blueCornerSoft: 'rgba(30, 58, 95, 0.12)',
};

interface FighterPickRowProps {
  /** Fighter name */
  fighterName: string;
  /** Fighter record (e.g., "24-4") */
  record?: string | null;
  /** Fighter's corner (red or blue) */
  corner: 'red' | 'blue';
  /** Is this fighter selected? */
  isSelected: boolean;
  /** Is the opponent selected? (for dimming) */
  isOpponentSelected?: boolean;
  /** Press handler */
  onPress: () => void;
  /** Info button press handler (navigate to fighter stats) */
  onInfoPress?: () => void;
  /** Disable interaction */
  disabled?: boolean;
  /** Result state for graded fights */
  result?: 'win' | 'loss' | null;
  /** Community pick percentage (shown when not selected) */
  communityPickPct?: number;
  /** Method of victory prediction (e.g., "Submission") */
  pickedMethod?: string | null;
  /** Round prediction (e.g., 2) */
  pickedRound?: number | null;
}

export function FighterPickRow({
  fighterName,
  record,
  corner,
  isSelected,
  isOpponentSelected = false,
  onPress,
  onInfoPress,
  disabled = false,
  result,
  communityPickPct,
  pickedMethod,
  pickedRound,
}: FighterPickRowProps) {
  const { colors, isDark } = useTheme();

  // Corner colors
  const cornerColor = corner === 'red' ? COLORS.redCorner : COLORS.blueCorner;
  const cornerColorSoft = corner === 'red' ? COLORS.redCornerSoft : COLORS.blueCornerSoft;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const selectionAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkmarkAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevSelected = useRef(isSelected);

  // Animate selection state changes
  useEffect(() => {
    if (result) return;

    if (isSelected !== prevSelected.current) {
      prevSelected.current = isSelected;

      if (isSelected) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.spring(selectionAnim, {
          toValue: 1,
          useNativeDriver: false,
          tension: 80,
          friction: 8,
        }).start();

        checkmarkAnim.setValue(0);
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
        }).start();

        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
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
        toValue: 0.98,
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
    ? result === 'win'
      ? isDark ? colors.successSoft : '#E8F5ED'
      : isDark ? colors.dangerSoft : '#FBEAEC'
    : selectionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.unselectedBg, COLORS.accentSoft],
      });

  const borderColor = result
    ? result === 'win' ? colors.success : colors.danger
    : selectionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.border, COLORS.accent],
      });

  // Checkmark scale animation
  const checkmarkScale = checkmarkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.3, 1],
  });

  // Text colors
  const getNameColor = () => {
    if (disabled) return colors.textTertiary;
    if (isOpponentSelected && !isSelected) return colors.textTertiary;
    return COLORS.textPrimary;
  };

  const getSecondaryColor = () => {
    if (disabled || (isOpponentSelected && !isSelected)) return colors.textTertiary;
    return colors.textSecondary;
  };

  // Format method prediction text
  const formatMethodText = (): string | null => {
    if (!pickedMethod && !pickedRound) return null;
    const method = pickedMethod?.replace('Decision - ', '').replace('Submission - ', '').toUpperCase() || '';
    const round = pickedRound ? `R${pickedRound}` : '';
    return [method, round].filter(Boolean).join(' ');
  };

  const methodText = isSelected ? formatMethodText() : null;
  const showCheckmark = isSelected && !result;
  const showCommunityPct = !isSelected && !result && communityPickPct !== undefined && communityPickPct > 0;

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
          {/* Corner Color Indicator - Left edge strip */}
          <View
            style={[
              styles.cornerIndicator,
              {
                backgroundColor: isSelected ? cornerColor : (isOpponentSelected ? colors.border : cornerColor),
                opacity: isSelected ? 1 : (isOpponentSelected ? 0.3 : 0.5),
              },
            ]}
          />

          {/* Left: Fighter Name + Record/Method stacked */}
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.fighterName, { color: getNameColor() }]}
                numberOfLines={1}
              >
                {fighterName}
              </Text>
              {onInfoPress && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onInfoPress();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.infoButton}
                >
                  <Ionicons name="information-circle-outline" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.secondaryRow}>
              {record && (
                <Text style={[styles.record, { color: getSecondaryColor() }]}>
                  {record}
                </Text>
              )}
              {methodText && (
                <View style={styles.methodBadge}>
                  <Text style={[styles.methodText, { color: getSecondaryColor() }]}>
                    {methodText}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Right: Checkmark or Community % or Result Badge */}
          <View style={styles.rightContent}>
            {showCheckmark && (
              <Animated.View
                style={[
                  styles.checkCircle,
                  { backgroundColor: COLORS.accent, transform: [{ scale: checkmarkScale }] },
                ]}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </Animated.View>
            )}

            {showCommunityPct && (
              <View style={styles.pctPill}>
                <Text style={[styles.pctText, { color: colors.textTertiary }]}>
                  {Math.round(communityPickPct)}% PICKED
                </Text>
              </View>
            )}

            {result === 'win' && (
              <View style={[styles.resultBadge, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            )}

            {result === 'loss' && (
              <View style={[styles.resultBadge, { backgroundColor: colors.danger }]}>
                <Ionicons name="close" size={14} color="#fff" />
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    borderRadius: radius.input,
    borderWidth: 1.5,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cornerIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fighterName: {
    ...displayTypography.fighterName,
  },
  infoButton: {
    padding: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  record: {
    fontSize: 13,
    fontWeight: '500',
  },
  methodBadge: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // Glow effect
    shadowColor: '#B0443F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  pctPill: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pctText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  resultBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
