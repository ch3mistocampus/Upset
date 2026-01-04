/**
 * LockExplainerModal - Explains pick locking to first-time users
 * Shows once when entering Event Picks for the first time
 */

import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography } from '../lib/tokens';
import { Button } from './ui';

interface LockExplainerModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function LockExplainerModal({ visible, onDismiss }: LockExplainerModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={[styles.content, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconContainer, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="lock-closed" size={32} color={colors.warning} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Picks lock when the event starts
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            You can change picks until they lock. After that, they can't be edited.
          </Text>

          <View style={styles.actions}>
            <Button
              title="Got it"
              onPress={onDismiss}
              variant="primary"
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actions: {
    width: '100%',
  },
});
