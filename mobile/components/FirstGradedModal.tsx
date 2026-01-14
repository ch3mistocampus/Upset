/**
 * FirstGradedModal - Celebrates user's first graded event
 * Shows once after first event results are available
 */

import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography, displayTypography } from '../lib/tokens';
import { Button } from './ui';

interface FirstGradedModalProps {
  visible: boolean;
  correct: number;
  total: number;
  onDismiss: () => void;
}

export function FirstGradedModal({ visible, correct, total, onDismiss }: FirstGradedModalProps) {
  const router = useRouter();
  const { colors } = useTheme();

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const handleAddFriend = () => {
    onDismiss();
    router.push('/(tabs)/friends');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={[styles.content, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconContainer, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="trophy" size={40} color={colors.success} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            The Tape Don't Lie
          </Text>

          <View style={styles.statsContainer}>
            <Text style={[styles.statsValue, { color: colors.accent }]}>
              {correct}/{total}
            </Text>
            <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
              correct ({accuracy}%)
            </Text>
          </View>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            The truth is in the tape. See how your calls stack up.
          </Text>

          <View style={styles.actions}>
            <Button
              title="Add a friend to compare"
              onPress={handleAddFriend}
              variant="primary"
            />
            <Button
              title="Close"
              onPress={onDismiss}
              variant="ghost"
            />
          </View>
        </Pressable>
      </Pressable>
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
  content: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...displayTypography.eventTitle,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsValue: {
    fontFamily: 'BebasNeue',
    fontSize: 36,
  },
  statsLabel: {
    ...typography.body,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
});
