/**
 * Profile screen - username, bio, stats summary, settings
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useUserStats, useProfile, useUpdateProfile } from '../../hooks/useQueries';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { Card, Button, SegmentedControl } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonProfileCard, SkeletonStats } from '../../components/SkeletonStats';
import { Avatar } from '../../components/Avatar';
import type { ThemeMode } from '../../lib/tokens';

const MAX_BIO_LENGTH = 280;

export default function Profile() {
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { profile: authProfile, user, signOut, refreshProfile } = useAuth();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useUserStats(user?.id || null);
  const { data: profileData, refetch: refetchProfile } = useProfile(user?.id || null);
  const updateProfile = useUpdateProfile();
  const toast = useToast();

  // Use the queried profile data if available, fallback to auth profile
  const profile = profileData || authProfile;

  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editBio, setEditBio] = useState('');

  // Sync edit bio with profile data
  useEffect(() => {
    if (profile?.bio !== undefined) {
      setEditBio(profile.bio || '');
    }
  }, [profile?.bio]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchProfile()]);
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleEditProfile = () => {
    setEditBio(profile?.bio || '');
    setEditModalVisible(true);
  };

  const handleSaveBio = async () => {
    if (!user) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await updateProfile.mutateAsync({
        userId: user.id,
        updates: { bio: editBio.trim() || null },
      });

      setEditModalVisible(false);
      toast.showSuccess('Bio updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Refresh profile in auth context
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Failed to update bio');
    }
  };

  if (statsLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <SkeletonProfileCard />
        <SkeletonStats />
      </ScrollView>
    );
  }

  if (statsError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          message="Failed to load your profile. Check your connection and try again."
          onRetry={() => refetchStats()}
        />
      </View>
    );
  }

  const hasStats = stats && stats.total_picks > 0;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Profile Header */}
        <Card>
          <View style={styles.profileHeader}>
            <Avatar
              imageUrl={profile?.avatar_url}
              username={profile?.username || 'User'}
              size="large"
              expandable
            />

            <View style={styles.profileInfo}>
              <Text style={[styles.username, { color: colors.textPrimary }]}>
                {profile?.username || 'Unknown'}
              </Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>
                {user?.email || ''}
              </Text>
            </View>

            {/* Edit Button */}
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.surfaceAlt }]}
              onPress={handleEditProfile}
            >
              <Ionicons name="pencil" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Bio Section */}
          <View style={[styles.bioSection, { borderTopColor: colors.divider }]}>
            {profile?.bio ? (
              <Text style={[styles.bioText, { color: colors.textPrimary }]}>
                {profile.bio}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleEditProfile}>
                <Text style={[styles.addBioText, { color: colors.textTertiary }]}>
                  + Add a bio
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Stats Summary */}
        <Card>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            YOUR STATS
          </Text>

          {hasStats ? (
            <>
              <View style={styles.statRow}>
                <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                  Total Picks
                </Text>
                <Text style={[styles.statRowValue, { color: colors.textPrimary }]}>
                  {stats.total_picks}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                  Correct Picks
                </Text>
                <Text style={[styles.statRowValue, { color: colors.success }]}>
                  {stats.correct_winner}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                  Accuracy
                </Text>
                <Text style={[styles.statRowValue, { color: colors.accent }]}>
                  {stats.accuracy_pct.toFixed(1)}%
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <View style={styles.statRow}>
                <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                  Current Streak
                </Text>
                <Text style={[styles.statRowValue, { color: colors.textPrimary }]}>
                  {stats.current_streak}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                  Best Streak
                </Text>
                <Text style={[styles.statRowValue, { color: colors.warning }]}>
                  {stats.best_streak}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.noStatsText, { color: colors.textSecondary }]}>
              No picks yet. Make some predictions!
            </Text>
          )}
        </Card>

        {/* Appearance */}
        <Card>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            APPEARANCE
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Theme
              </Text>
            </View>
          </View>

          <SegmentedControl<ThemeMode>
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            selectedValue={themeMode}
            onChange={setThemeMode}
          />
        </Card>

        {/* Sign Out */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
        />

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textTertiary }]}>
            UFC Picks Tracker v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Edit Profile
            </Text>
            <TouchableOpacity
              onPress={handleSaveBio}
              disabled={updateProfile.isPending}
            >
              <Text style={[
                styles.modalSave,
                { color: updateProfile.isPending ? colors.textTertiary : colors.accent }
              ]}>
                {updateProfile.isPending ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent}>
            <View style={styles.editSection}>
              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>
                BIO
              </Text>
              <TextInput
                style={[
                  styles.bioInput,
                  {
                    backgroundColor: colors.surfaceAlt,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                value={editBio}
                onChangeText={(text) => setEditBio(text.slice(0, MAX_BIO_LENGTH))}
                placeholder="Tell others about yourself..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                maxLength={MAX_BIO_LENGTH}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {editBio.length}/{MAX_BIO_LENGTH}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardLabel: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  username: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.meta,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  bioText: {
    ...typography.body,
    lineHeight: 22,
  },
  addBioText: {
    ...typography.body,
    fontStyle: 'italic',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statRowLabel: {
    ...typography.body,
  },
  statRowValue: {
    ...typography.body,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  noStatsText: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingLabel: {
    ...typography.body,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  appInfoText: {
    ...typography.meta,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalCancel: {
    ...typography.body,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalSave: {
    ...typography.body,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  editSection: {
    marginBottom: spacing.xl,
  },
  editLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: radius.input,
    padding: spacing.md,
    minHeight: 120,
    ...typography.body,
  },
  charCount: {
    ...typography.meta,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
});
