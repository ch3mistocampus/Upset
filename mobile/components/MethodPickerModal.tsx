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
export type MethodType = 'KO_TKO' | 'SUB' | 'DEC' | 'DQ' | 'OTHER';

// Method options with display labels
export const METHOD_OPTIONS: { value: MethodType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'KO_TKO', label: 'KO/TKO', icon: 'flash-outline' },
  { value: 'SUB', label: 'Submission', icon: 'hand-left-outline' },
  { value: 'DEC', label: 'Decision', icon: 'clipboard-outline' },
  { value: 'DQ', label: 'DQ', icon: 'warning-outline' },
  { value: 'OTHER', label: 'Other', icon: 'help-circle-outline' },
];

// Methods that require round selection (finishes)
const FINISH_METHODS: MethodType[] = ['KO_TKO', 'SUB', 'DQ', 'OTHER'];

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
  if (upper.includes('DQ') || upper.includes('DISQ')) return 'DQ';
  if (upper === 'OTHER' || upper.includes('OTHER')) return 'OTHER';

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
    case 'DQ': return 'DQ';
    case 'OTHER': return 'Other';
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

  // Determine if round selection is needed
  const needsRound = selectedMethod && FINISH_METHODS.includes(selectedMethod);

  // Check if save is allowed
  const canSave = selectedMethod && (!needsRound || selectedRound);

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

  // Handle method selection
  const handleMethodSelect = (method: MethodType) => {
    Haptics.selectionAsync();
    setSelectedMethod(method);

    // Clear round if switching to decision (doesn't need round)
    if (!FINISH_METHODS.includes(method)) {
      setSelectedRound(null);
    }
  };

  // Handle round selection
  const handleRoundSelect = (round: number) => {
    Haptics.selectionAsync();
    setSelectedRound(round);
  };

  // Handle save
  const handleSave = () => {
    if (!canSave) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(
      selectedMethod ? methodTypeToString(selectedMethod) : null,
      needsRound ? selectedRound : null
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
                      size={16}
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
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Round Selection (conditional) */}
          {needsRound && (
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
              {!selectedRound && (
                <Text style={[styles.roundHint, { color: colors.textTertiary }]}>
                  Select a round to continue
                </Text>
              )}
            </View>
          )}

          {/* Selection Summary */}
          {selectedMethod && (
            <View style={[styles.summaryBanner, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.summaryText, { color: colors.success }]}>
                {selectedFighterName} by {METHOD_OPTIONS.find(m => m.value === selectedMethod)?.label}
                {needsRound && selectedRound ? ` in Round ${selectedRound}` : ''}
              </Text>
            </View>
          )}

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
    padding: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.meta,
  },
  fighterBanner: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  methodChipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  roundRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roundChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundChipLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  roundHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
