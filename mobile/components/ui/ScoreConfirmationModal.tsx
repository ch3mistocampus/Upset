/**
 * Score Confirmation Modal
 *
 * Confirms the user's score selection before submission.
 * Shows breakdown of what they're about to submit.
 */

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';
import type { ScoreOption } from '../../types/scorecard';
import * as Haptics from 'expo-haptics';

interface ScoreConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedScore: ScoreOption | null;
  roundNumber: number;
  redName: string;
  blueName: string;
  isSubmitting: boolean;
}

export function ScoreConfirmationModal({
  visible,
  onClose,
  onConfirm,
  selectedScore,
  roundNumber,
  redName,
  blueName,
  isSubmitting,
}: ScoreConfirmationModalProps) {
  const { colors, isDark } = useTheme();

  if (!selectedScore) return null;

  const isRedWin = selectedScore.score_red > selectedScore.score_blue;
  const isBlueWin = selectedScore.score_blue > selectedScore.score_red;
  const isEven = selectedScore.score_red === selectedScore.score_blue;

  const cornerColors = {
    red: isDark ? '#C54A50' : '#943538',
    blue: isDark ? '#4A6FA5' : '#1E3A5F',
  };

  const winnerColor = isRedWin ? cornerColors.red : isBlueWin ? cornerColors.blue : colors.textSecondary;
  const winnerName = isRedWin ? redName : isBlueWin ? blueName : 'Even Round';
  const scoreDiff = Math.abs(selectedScore.score_red - selectedScore.score_blue);

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modal, { backgroundColor: colors.surface }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: winnerColor + '20' }]}>
                  <Ionicons name="create" size={24} color={winnerColor} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Confirm Score</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Round {roundNumber}
                </Text>
              </View>

              {/* Score Preview */}
              <View style={[styles.scorePreview, { backgroundColor: colors.surfaceAlt }]}>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreSide}>
                    <View style={[styles.cornerDot, { backgroundColor: cornerColors.red }]} />
                    <Text style={[styles.fighterLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                      {redName}
                    </Text>
                    <Text
                      style={[
                        styles.scoreValue,
                        { color: isRedWin ? cornerColors.red : colors.text },
                        isRedWin && styles.scoreValueWinner,
                      ]}
                    >
                      {selectedScore.score_red}
                    </Text>
                  </View>

                  <View style={styles.scoreDivider}>
                    <Text style={[styles.scoreDash, { color: colors.textTertiary }]}>-</Text>
                  </View>

                  <View style={[styles.scoreSide, styles.scoreSideRight]}>
                    <Text
                      style={[
                        styles.scoreValue,
                        { color: isBlueWin ? cornerColors.blue : colors.text },
                        isBlueWin && styles.scoreValueWinner,
                      ]}
                    >
                      {selectedScore.score_blue}
                    </Text>
                    <Text style={[styles.fighterLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                      {blueName}
                    </Text>
                    <View style={[styles.cornerDot, { backgroundColor: cornerColors.blue }]} />
                  </View>
                </View>

                {/* Winner indicator */}
                <View style={[styles.winnerRow, { borderTopColor: colors.border }]}>
                  {isEven ? (
                    <Text style={[styles.winnerText, { color: colors.textSecondary }]}>
                      Even round (10-10)
                    </Text>
                  ) : (
                    <>
                      <View style={[styles.winnerDot, { backgroundColor: winnerColor }]} />
                      <Text style={[styles.winnerText, { color: winnerColor }]}>
                        {winnerName} wins round
                        {scoreDiff > 1 && ` (${scoreDiff === 2 ? 'dominant' : 'dominant'} performance)`}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* Warning */}
              <View style={[styles.warning, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="information-circle" size={18} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Scores cannot be changed after submission
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={onClose}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: winnerColor }]}
                  onPress={handleConfirm}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.confirmButtonText}>Submit Score</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  scorePreview: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreSideRight: {
    justifyContent: 'flex-end',
  },
  cornerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fighterLabel: {
    fontSize: 12,
    flex: 1,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  scoreValueWinner: {
    fontSize: 36,
  },
  scoreDivider: {
    paddingHorizontal: spacing.sm,
  },
  scoreDash: {
    fontSize: 24,
    fontWeight: '300',
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
  },
  winnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  winnerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ScoreConfirmationModal;
