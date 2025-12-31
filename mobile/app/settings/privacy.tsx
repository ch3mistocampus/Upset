/**
 * Privacy Settings screen - control visibility of picks, profile, and stats
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePrivacy } from '../../hooks/usePrivacy';
import { useToast } from '../../hooks/useToast';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
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
}

function SettingSection({
  title,
  description,
  currentValue,
  onSelect,
  isLoading,
}: SettingSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>

      <View style={styles.optionsContainer}>
        {VISIBILITY_OPTIONS.map((option) => {
          const isSelected = currentValue === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => onSelect(option.value)}
              disabled={isLoading}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={isSelected ? '#fff' : '#999'}
              />
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function PrivacySettings() {
  const router = useRouter();
  const toast = useToast();
  const { privacySettings, isLoading, error, updatePrivacySettings, updateLoading, refetch } =
    usePrivacy();

  const [saving, setSaving] = useState<string | null>(null);

  const handleUpdate = async (field: string, value: VisibilityLevel) => {
    try {
      setSaving(field);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Settings</Text>
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Settings</Text>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <View style={styles.placeholder}>
          {(updateLoading || saving) && (
            <ActivityIndicator size="small" color="#d4202a" />
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#d4202a" />
          <Text style={styles.infoText}>
            Control who can see your picks, profile, and statistics. Changes take effect immediately.
          </Text>
        </View>

        {/* Profile Visibility */}
        <SettingSection
          title="Profile Visibility"
          description="Who can see your profile information and username"
          currentValue={privacySettings.profile_visibility}
          onSelect={(value) => handleUpdate('profile_visibility', value)}
          isLoading={saving === 'profile_visibility'}
        />

        {/* Picks Visibility */}
        <SettingSection
          title="Picks Visibility"
          description="Who can see your fight predictions"
          currentValue={privacySettings.picks_visibility}
          onSelect={(value) => handleUpdate('picks_visibility', value)}
          isLoading={saving === 'picks_visibility'}
        />

        {/* Stats Visibility */}
        <SettingSection
          title="Stats Visibility"
          description="Who can see your accuracy and statistics"
          currentValue={privacySettings.stats_visibility}
          onSelect={(value) => handleUpdate('stats_visibility', value)}
          isLoading={saving === 'stats_visibility'}
        />

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>About Privacy Levels</Text>
          <View style={styles.helpItem}>
            <Ionicons name="globe-outline" size={18} color="#999" />
            <Text style={styles.helpText}>
              <Text style={styles.helpBold}>Public:</Text> Anyone on the app can view this information
            </Text>
          </View>
          <View style={styles.helpItem}>
            <Ionicons name="people-outline" size={18} color="#999" />
            <Text style={styles.helpText}>
              <Text style={styles.helpBold}>Friends Only:</Text> Only users you've added as friends can view
            </Text>
          </View>
          <View style={styles.helpItem}>
            <Ionicons name="lock-closed-outline" size={18} color="#999" />
            <Text style={styles.helpText}>
              <Text style={styles.helpBold}>Private:</Text> Only you can see this information
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 32,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  optionSelected: {
    borderColor: '#d4202a',
    backgroundColor: '#1a1a1a',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    color: '#fff',
    marginBottom: 2,
  },
  optionLabelSelected: {
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
  },
  helpSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 8,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  helpBold: {
    fontWeight: '600',
    color: '#ccc',
  },
});
