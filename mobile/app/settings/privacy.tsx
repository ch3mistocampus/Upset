/**
 * Privacy Settings screen - control visibility of picks, profile, and stats
 * Theme-aware design with SurfaceCard
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePrivacy } from '../../hooks/usePrivacy';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import { SurfaceCard } from '../../components/ui';
import type { VisibilityLevel } from '../../types/social';

interface VisibilityOption {
  value: VisibilityLevel;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can see',
    icon: 'globe-outline',
  },
  {
    value: 'friends',
    label: 'Friends Only',
    description: 'Only friends can see',
    icon: 'people-outline',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see',
    icon: 'lock-closed-outline',
  },
];

interface SettingSectionProps {
  title: string;
  description: string;
  currentValue: VisibilityLevel;
  onSelect: (value: VisibilityLevel) => void;
  isLoading?: boolean;
  colors: any;
}

function SettingSection({
  title,
  description,
  currentValue,
  onSelect,
  isLoading,
  colors,
}: SettingSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>{description}</Text>

      <View style={styles.optionsContainer}>
        {VISIBILITY_OPTIONS.map((option) => {
          const isSelected = currentValue === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? colors.accent : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(option.value);
              }}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={isSelected ? colors.accent : colors.textTertiary}
              />
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionLabel,
                  { color: colors.text },
                  isSelected && { fontWeight: '600' }
                ]}>
                  {option.label}
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textTertiary }]}>
                  {option.description}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function PrivacySettings() {
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { privacySettings, isLoading, error, updatePrivacySettings, updateLoading, refetch } =
    usePrivacy();

  const [saving, setSaving] = useState<string | null>(null);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim]);

  const handleUpdate = async (field: string, value: VisibilityLevel) => {
    try {
      setSaving(field);
      await updatePrivacySettings({ [field]: value });
      toast.showSuccess('Privacy settings updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to update settings');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  if (error || !privacySettings) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState
          message="Failed to load privacy settings"
          onRetry={refetch}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Settings</Text>
        <View style={styles.placeholder}>
          {(updateLoading || saving) && (
            <ActivityIndicator size="small" color={colors.accent} />
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          }}
        >
          {/* Info Card */}
          <SurfaceCard weakWash style={{ marginBottom: spacing.lg }}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Control who can see your picks, profile, and statistics. Changes take effect immediately.
              </Text>
            </View>
          </SurfaceCard>

          {/* Profile Visibility */}
          <SettingSection
            title="Profile Visibility"
            description="Who can see your profile information and username"
            currentValue={privacySettings.profile_visibility}
            onSelect={(value) => handleUpdate('profile_visibility', value)}
            isLoading={saving === 'profile_visibility'}
            colors={colors}
          />

          {/* Picks Visibility */}
          <SettingSection
            title="Picks Visibility"
            description="Who can see your fight predictions"
            currentValue={privacySettings.picks_visibility}
            onSelect={(value) => handleUpdate('picks_visibility', value)}
            isLoading={saving === 'picks_visibility'}
            colors={colors}
          />

          {/* Stats Visibility */}
          <SettingSection
            title="Stats Visibility"
            description="Who can see your accuracy and statistics"
            currentValue={privacySettings.stats_visibility}
            onSelect={(value) => handleUpdate('stats_visibility', value)}
            isLoading={saving === 'stats_visibility'}
            colors={colors}
          />

          {/* Help Text */}
          <SurfaceCard weakWash style={{ marginTop: spacing.xs }}>
            <Text style={[styles.helpTitle, { color: colors.text }]}>About Privacy Levels</Text>
            <View style={styles.helpItem}>
              <Ionicons name="globe-outline" size={18} color={colors.textTertiary} />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                <Text style={[styles.helpBold, { color: colors.text }]}>Public:</Text> Anyone on the app can view this information
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="people-outline" size={18} color={colors.textTertiary} />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                <Text style={[styles.helpBold, { color: colors.text }]}>Friends Only:</Text> Only users you've added as friends can view
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                <Text style={[styles.helpBold, { color: colors.text }]}>Private:</Text> Only you can see this information
              </Text>
            </View>
          </SurfaceCard>
        </Animated.View>
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 32,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    ...typography.meta,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    ...typography.meta,
    marginBottom: spacing.sm,
  },
  optionsContainer: {
    gap: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.input,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  helpTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  helpText: {
    flex: 1,
    ...typography.meta,
    lineHeight: 18,
  },
  helpBold: {
    fontWeight: '600',
  },
});
