/**
 * Method Picker Modal
 * Premium modal for selecting fight method and round predictions
 *
 * Features:
 * - Displays both fighters with selected winner highlighted
 * - Method selection via chips (KO/TKO, SUB, Decision, DQ, Other)
 * - Conditional round selection (only for finish methods)
 * - Dynamic round count based on bout data
 * - Skip/Save/Cancel actions
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography, shadows, fighterColors } from '../lib/tokens';

// Method types for structured storage
export type MethodType = 'KO_TKO' | 'SUB' | 'DEC';

// Method options with display labels
export const METHOD_OPTIONS: { value: MethodType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'KO_TKO', label: 'KO/TKO', icon: 'flash-outline' },
  { value: 'SUB', label: 'Submission', icon: 'hand-left-outline' },
  { value: 'DEC', label: 'Decision', icon: 'clipboard-outline' },
];

interface MethodPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (method: string | null, round: number | null) => void;

  // Fighter info
  redFighter: string;
  blueFighter: string;
  selectedCorner: 'red' | 'blue';

  // Current values (for editing existing pick)
  currentMethod?: string | null;
  currentRound?: number | null;

  // Bout data for round determination
  // TODO: If bout has scheduledRounds field, use that instead of inferring
  scheduledRounds?: number;
  isMainEvent?: boolean;
  orderIndex?: number;
}

/**
 * Determines the number of rounds for a bout
 * Priority:
 * 1. Explicit scheduledRounds from bout data
 * 2. isMainEvent flag (5 rounds if true)
 * 3. orderIndex === 0 (main event position = 5 rounds)
 * 4. Fallback to 3 rounds
 */
function getScheduledRounds(props: Pick<MethodPickerModalProps, 'scheduledRounds' | 'isMainEvent' | 'orderIndex'>): number {
  const { scheduledRounds, isMainEvent, orderIndex } = props;

  // Explicit rounds from bout data takes priority
  if (scheduledRounds && scheduledRounds > 0) {
    return scheduledRounds;
  }

  // Main event flag
  if (isMainEvent) {
    return 5;
  }

  // Position-based inference (index 0 = main event)
  if (orderIndex === 0) {
    return 5;
  }

  // Default to 3 rounds for regular fights
  // TODO: Consider adding scheduledRounds to bout schema if this inference is insufficient
  return 3;
}

/**
 * Parse stored method string back to MethodType
 * Handles various formats from existing data
 */
function parseMethodType(method: string | null | undefined): MethodType | null {
  if (!method) return null;

  const upper = method.toUpperCase();

  if (upper.includes('KO') || upper.includes('TKO')) return 'KO_TKO';
  if (upper.includes('SUB')) return 'SUB';
  if (upper.includes('DEC')) return 'DEC';

  return null;
}

/**
 * Convert MethodType to display string for storage
 */
function methodTypeToString(method: MethodType): string {
  switch (method) {
    case 'KO_TKO': return 'KO/TKO';
    case 'SUB': return 'Submission';
    case 'DEC': return 'Decision';
    default: return method;
  }
}

export function MethodPickerModal({
  visible,
  onClose,
  onConfirm,
  redFighter,
  blueFighter,
  selectedCorner,
  currentMethod,
  currentRound,
  scheduledRounds,
  isMainEvent,
  orderIndex,
}: MethodPickerModalProps) {
  const { colors, isDark, shadows: themeShadows } = useTheme();

  // State
  const [selectedMethod, setSelectedMethod] = useState<MethodType | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Calculate rounds
  const maxRounds = useMemo(() =>
    getScheduledRounds({ scheduledRounds, isMainEvent, orderIndex }),
    [scheduledRounds, isMainEvent, orderIndex]
  );

  const roundOptions = useMemo(() =>
    Array.from({ length: maxRounds }, (_, i) => i + 1),
    [maxRounds]
  );

  // Check if save is allowed - can save with just method OR just round OR both
  const canSave = selectedMethod || selectedRound;

  // Corner colors
  const cornerColor = selectedCorner === 'red'
    ? (isDark ? fighterColors.red.solid.dark : fighterColors.red.solid.light)
    : (isDark ? fighterColors.blue.solid.dark : fighterColors.blue.solid.light);

  const selectedFighterName = selectedCorner === 'red' ? redFighter : blueFighter;

  // Reset and animate when modal opens
  useEffect(() => {
    if (visible) {
      // Parse existing method
      setSelectedMethod(parseMethodType(currentMethod));
      setSelectedRound(currentRound || null);

      // Animate in
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      backdropAnim.setValue(0);
    }
  }, [visible, currentMethod, currentRound]);

  // Handle method selection - toggle if already selected
  const handleMethodSelect = (method: MethodType) => {
    Haptics.selectionAsync();
    if (selectedMethod === method) {
      setSelectedMethod(null); // Deselect
    } else {
      setSelectedMethod(method);
    }
  };

  // Handle round selection - toggle if already selected
  const handleRoundSelect = (round: number) => {
    Haptics.selectionAsync();
    if (selectedRound === round) {
      setSelectedRound(null); // Deselect
    } else {
      setSelectedRound(round);
    }
  };

  // Handle save
  const handleSave = () => {
    if (!canSave) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(
      selectedMethod ? methodTypeToString(selectedMethod) : null,
      selectedRound
    );
    onClose();
  };

  // Handle skip (save winner only)
  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm(null, null);
    onClose();
  };

  // Handle cancel
  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Animate out before closing
  const animateOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropAnim }
        ]}
      >
        <Pressable style={styles.backdropPressable} onPress={handleCancel} />

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              ...themeShadows.card,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Pick Method
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Optional - predict how the fight ends
            </Text>
          </View>

          {/* Fighter Banner */}
          <View style={[styles.fighterBanner, { backgroundColor: cornerColor }]}>
            <View style={styles.fighterContent}>
              <View style={styles.winnerBadge}>
                <Ionicons name="trophy" size={14} color={cornerColor} />
              </View>
              <Text style={styles.fighterName} numberOfLines={1}>
                {selectedFighterName}
              </Text>
              <Text style={styles.winsBy}>wins by...</Text>
            </View>
          </View>

          {/* Method Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Method of Victory
            </Text>
            <View style={styles.methodGrid}>
              {METHOD_OPTIONS.map((option) => {
                const isSelected = selectedMethod === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.methodChip,
                      {
                        backgroundColor: isSelected ? cornerColor : colors.surfaceAlt,
                        borderColor: isSelected ? cornerColor : colors.border,
                      },
                    ]}
                    onPress={() => handleMethodSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color={isSelected ? '#fff' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.methodChipLabel,
                        { color: isSelected ? '#fff' : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Round Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              In Round
            </Text>
            <View style={styles.roundRow}>
              {roundOptions.map((round) => {
                const isSelected = selectedRound === round;
                return (
                  <TouchableOpacity
                    key={round}
                    style={[
                      styles.roundChip,
                      {
                        backgroundColor: isSelected ? cornerColor : colors.surfaceAlt,
                        borderColor: isSelected ? cornerColor : colors.border,
                      },
                    ]}
                    onPress={() => handleRoundSelect(round)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roundChipLabel,
                        { color: isSelected ? '#fff' : colors.text },
                      ]}
                    >
                      R{round}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.skipButton, { backgroundColor: colors.surfaceAlt }]}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                Skip Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: canSave ? cornerColor : colors.surfaceAlt,
                  opacity: canSave ? 1 : 0.5,
                },
              ]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  { color: canSave ? '#fff' : colors.textTertiary },
                ]}
              >
                Save Pick
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cancel Link */}
          <TouchableOpacity
            style={styles.cancelLink}
            onPress={handleCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.cancelLinkText, { color: colors.textTertiary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.meta,
  },
  fighterBanner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  fighterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  winnerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fighterName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  winsBy: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  methodGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  methodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  methodChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  roundRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roundChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundChipLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
