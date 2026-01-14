/**
 * AuthPromptModal - Context-aware prompt for guest users to sign in
 * Shows different messaging based on the feature being accessed
 */

import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography, displayTypography } from '../lib/tokens';
import { Button } from './ui';

export type AuthContext = 'friends' | 'leaderboard' | 'history' | 'sync' | 'picks' | 'social' | 'settings';

interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onContinueAsGuest?: () => void;
  context: AuthContext;
}

const COPY: Record<AuthContext, { title: string; body: string; icon: keyof typeof Ionicons.glyphMap }> = {
  friends: {
    title: 'Add friends to compete',
    body: 'Create an account to add friends and see how you compare.',
    icon: 'people',
  },
  leaderboard: {
    title: 'Join the rankings',
    body: 'Sign in to appear on the leaderboard and track your accuracy over time.',
    icon: 'trophy',
  },
  history: {
    title: 'Save your picks history',
    body: 'Create an account to keep your picks across events and devices.',
    icon: 'time',
  },
  sync: {
    title: 'Sync across devices',
    body: 'Sign in to access your picks from any device.',
    icon: 'cloud-upload',
  },
  picks: {
    title: 'Save your picks',
    body: 'Create an account to save your picks permanently, track your accuracy, and compete on the leaderboards.',
    icon: 'bookmark',
  },
  social: {
    title: 'Join the community',
    body: 'Create an account to post, comment, like, and connect with other MMA fans.',
    icon: 'chatbubbles',
  },
  settings: {
    title: 'Account required',
    body: 'Create an account to access all settings and customize your experience.',
    icon: 'settings',
  },
};

export function AuthPromptModal({ visible, onClose, onSignIn, onContinueAsGuest, context }: AuthPromptModalProps) {
  const { colors } = useTheme();
  const copy = COPY[context];

  const handleSignIn = () => {
    onClose();
    onSignIn();
  };

  const handleContinueAsGuest = () => {
    onClose();
    onContinueAsGuest?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.content, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
            <Ionicons name={copy.icon} size={32} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {copy.title}
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {copy.body}
          </Text>

          <View style={styles.actions}>
            <Button
              title="Sign In / Create Account"
              onPress={handleSignIn}
              variant="primary"
            />
            {onContinueAsGuest && (
              <Button
                title="Continue as Guest"
                onPress={handleContinueAsGuest}
                variant="secondary"
              />
            )}
            <Button
              title="Not Now"
              onPress={onClose}
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...displayTypography.sectionTitle,
    fontSize: 22,
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
    gap: spacing.sm,
  },
});
