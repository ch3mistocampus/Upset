/**
 * Account Settings Screen
 *
 * Manage account settings including:
 * - Account deletion (Apple App Store requirement)
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../hooks/useAuth';
import { useAccountManagement } from '../../hooks/useAccountManagement';
import { spacing, radius, typography } from '../../lib/tokens';
import { SurfaceCard } from '../../components/ui';

export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { deleteAccount, isDeleting } = useAccountManagement();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      setDeleteError('Please type "DELETE MY ACCOUNT" exactly to confirm.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setDeleteError(null);
      await deleteAccount(confirmText);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been deleted.',
        [{ text: 'OK' }]
      );

      // User will be signed out automatically by the hook
    } catch (error: any) {
      setDeleteError(error.message || 'Failed to delete account');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const openDeleteModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setConfirmText('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Info */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT INFO</Text>
          <SurfaceCard>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.email || 'Not set'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Username</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                @{profile?.username || 'Unknown'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Member since</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Unknown'}
              </Text>
            </View>
          </SurfaceCard>
        </View>

        {/* Danger Zone */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionLabel, { color: colors.danger }]}>DANGER ZONE</Text>
          <SurfaceCard>
            <TouchableOpacity
              style={[styles.dangerButton, { borderColor: colors.danger }]}
              onPress={openDeleteModal}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.dangerButtonText, { color: colors.danger }]}>
                Delete Account
              </Text>
            </TouchableOpacity>

            <Text style={[styles.dangerWarning, { color: colors.textTertiary }]}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </Text>
          </SurfaceCard>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.warningCard, { backgroundColor: colors.danger + '15' }]}>
              <Ionicons name="warning" size={32} color={colors.danger} />
              <Text style={[styles.warningTitle, { color: colors.danger }]}>
                This action is permanent
              </Text>
              <Text style={[styles.warningText, { color: colors.text }]}>
                Deleting your account will permanently remove:
              </Text>
              <View style={styles.warningList}>
                <Text style={[styles.warningItem, { color: colors.textSecondary }]}>
                  • All your picks and predictions
                </Text>
                <Text style={[styles.warningItem, { color: colors.textSecondary }]}>
                  • Your profile and stats
                </Text>
                <Text style={[styles.warningItem, { color: colors.textSecondary }]}>
                  • Friend connections
                </Text>
                <Text style={[styles.warningItem, { color: colors.textSecondary }]}>
                  • Activity history
                </Text>
              </View>
            </View>

            <Text style={[styles.confirmLabel, { color: colors.text }]}>
              Type <Text style={{ fontWeight: '700' }}>DELETE MY ACCOUNT</Text> to confirm:
            </Text>

            <TextInput
              style={[
                styles.confirmInput,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: deleteError ? colors.danger : colors.border,
                },
              ]}
              value={confirmText}
              onChangeText={(text) => {
                setConfirmText(text);
                setDeleteError(null);
              }}
              placeholder="DELETE MY ACCOUNT"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {deleteError && (
              <Text style={[styles.errorText, { color: colors.danger }]}>{deleteError}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.deleteButton,
                {
                  backgroundColor:
                    confirmText === 'DELETE MY ACCOUNT' ? colors.danger : colors.border,
                },
              ]}
              onPress={handleDeleteAccount}
              disabled={isDeleting || confirmText !== 'DELETE MY ACCOUNT'}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>Permanently Delete Account</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 24,
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: 'BebasNeue',
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: typography.sizes.md,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium as '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dangerButtonText: {
    fontFamily: 'BebasNeue',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  dangerWarning: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalCancel: {
    fontSize: typography.sizes.md,
  },
  modalTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 22,
    letterSpacing: 0.3,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  warningCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  warningTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 22,
    letterSpacing: 0.3,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  warningList: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  warningItem: {
    fontSize: typography.sizes.sm,
    marginBottom: 4,
  },
  confirmLabel: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.sm,
  },
  confirmInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  deleteButtonText: {
    fontFamily: 'BebasNeue',
    color: '#FFFFFF',
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
