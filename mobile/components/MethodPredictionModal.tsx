/**
 * Method Prediction Modal
 * Allows users to predict how a fight will end (method and round)
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography, displayTypography } from '../lib/tokens';

// Method categories and options
export const METHODS = {
  decision: {
    label: 'Decision',
    icon: 'clipboard-outline' as const,
    options: [
      { value: 'Decision - Unanimous', label: 'Unanimous Decision' },
      { value: 'Decision - Split', label: 'Split Decision' },
      { value: 'Decision - Majority', label: 'Majority Decision' },
    ],
  },
  knockout: {
    label: 'KO/TKO',
    icon: 'flash-outline' as const,
    options: [
      { value: 'KO/TKO', label: 'KO/TKO' },
      { value: 'TKO - Punches', label: 'TKO - Punches' },
      { value: 'TKO - Doctor Stoppage', label: 'TKO - Doctor Stoppage' },
    ],
  },
  submission: {
    label: 'Submission',
    icon: 'hand-left-outline' as const,
    options: [
      { value: 'Submission', label: 'Submission' },
      { value: 'Submission - Rear Naked Choke', label: 'Rear Naked Choke' },
      { value: 'Submission - Armbar', label: 'Armbar' },
      { value: 'Submission - Guillotine', label: 'Guillotine' },
      { value: 'Submission - Triangle', label: 'Triangle' },
    ],
  },
};

// Max rounds based on fight type (main events are 5 rounds, others are 3)
export const ROUNDS = [1, 2, 3, 4, 5];

interface MethodPredictionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (method: string | null, round: number | null) => void;
  fighterName: string;
  corner: 'red' | 'blue';
  currentMethod?: string | null;
  currentRound?: number | null;
  isMainEvent?: boolean;
}

export function MethodPredictionModal({
  visible,
  onClose,
  onConfirm,
  fighterName,
  corner,
  currentMethod,
  currentRound,
  isMainEvent = false,
}: MethodPredictionModalProps) {
  const { colors, isDark } = useTheme();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(currentMethod || null);
  const [selectedRound, setSelectedRound] = useState<number | null>(currentRound || null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Determine if method requires a round selection (non-decision methods need round)
  const needsRound = selectedMethod && !selectedMethod.toLowerCase().includes('decision');
  const maxRounds = isMainEvent ? 5 : 3;

  useEffect(() => {
    if (visible) {
      setSelectedMethod(currentMethod || null);
      setSelectedRound(currentRound || null);
      setExpandedCategory(null);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, currentMethod, currentRound]);

  const handleMethodSelect = (method: string) => {
    Haptics.selectionAsync();
    setSelectedMethod(method);
    // Clear round if switching to decision
    if (method.toLowerCase().includes('decision')) {
      setSelectedRound(null);
    }
  };

  const handleRoundSelect = (round: number) => {
    Haptics.selectionAsync();
    setSelectedRound(round);
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(selectedMethod, needsRound ? selectedRound : null);
    onClose();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm(null, null);
    onClose();
  };

  const cornerColor = corner === 'red'
    ? (isDark ? '#C54A50' : '#943538')
    : (isDark ? '#4A6FA5' : '#1E3A5F');

  const canConfirm = selectedMethod && (!needsRound || selectedRound);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              Predict the Finish
            </Text>
            <View style={styles.closeButton} />
          </View>

          {/* Fighter Info */}
          <View style={[styles.fighterBanner, { backgroundColor: cornerColor }]}>
            <Text style={styles.fighterName}>{fighterName} wins by...</Text>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Method Selection */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Method of Victory
            </Text>

            {Object.entries(METHODS).map(([key, category]) => (
              <View key={key} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryHeader,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: expandedCategory === key ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setExpandedCategory(expandedCategory === key ? null : key);
                  }}
                >
                  <View style={styles.categoryLeft}>
                    <Ionicons
                      name={category.icon}
                      size={20}
                      color={expandedCategory === key ? colors.accent : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: expandedCategory === key ? colors.accent : colors.text },
                      ]}
                    >
                      {category.label}
                    </Text>
                  </View>
                  <Ionicons
                    name={expandedCategory === key ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>

                {expandedCategory === key && (
                  <View style={styles.optionsContainer}>
                    {category.options.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor:
                              selectedMethod === option.value
                                ? cornerColor
                                : colors.surfaceAlt,
                            borderColor:
                              selectedMethod === option.value
                                ? cornerColor
                                : colors.border,
                          },
                        ]}
                        onPress={() => handleMethodSelect(option.value)}
                      >
                        {selectedMethod === option.value && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color:
                                selectedMethod === option.value ? '#fff' : colors.text,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* Selected Method Display */}
            {selectedMethod && (
              <View style={[styles.selectedMethodBadge, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.selectedMethodText, { color: colors.success }]}>
                  {selectedMethod}
                </Text>
              </View>
            )}

            {/* Round Selection (only for non-decision methods) */}
            {needsRound && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
                  In Round
                </Text>
                <View style={styles.roundsContainer}>
                  {ROUNDS.slice(0, maxRounds).map((round) => (
                    <TouchableOpacity
                      key={round}
                      style={[
                        styles.roundButton,
                        {
                          backgroundColor:
                            selectedRound === round ? cornerColor : colors.surfaceAlt,
                          borderColor:
                            selectedRound === round ? cornerColor : colors.border,
                        },
                      ]}
                      onPress={() => handleRoundSelect(round)}
                    >
                      <Text
                        style={[
                          styles.roundText,
                          { color: selectedRound === round ? '#fff' : colors.text },
                        ]}
                      >
                        R{round}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.skipButton, { backgroundColor: colors.surfaceAlt }]}
              onPress={handleSkip}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: canConfirm ? cornerColor : colors.surfaceAlt,
                  opacity: canConfirm ? 1 : 0.5,
                },
              ]}
              onPress={handleConfirm}
              disabled={!canConfirm}
            >
              <Text
                style={[
                  styles.confirmButtonText,
                  { color: canConfirm ? '#fff' : colors.textTertiary },
                ]}
              >
                Confirm Prediction
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
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
  container: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'BebasNeue',
    fontSize: 22,
    letterSpacing: 0.3,
  },
  fighterBanner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  fighterName: {
    fontFamily: 'BebasNeue',
    color: '#fff',
    fontSize: 18,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 16,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  categoryContainer: {
    marginBottom: spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionsContainer: {
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginLeft: spacing.lg,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  selectedMethodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  roundsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roundButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  roundText: {
    fontFamily: 'BebasNeue',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
  },
  skipButtonText: {
    fontFamily: 'BebasNeue',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontFamily: 'BebasNeue',
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
