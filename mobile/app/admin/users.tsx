/**
 * User Management Screen
 *
 * Admin screen for searching and managing users.
 */

import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useAdminUserSearch, AdminUser, useBanUser } from '../../hooks/useAdmin';
import { spacing, radius, typography } from '../../lib/tokens';

interface UserCardProps {
  user: AdminUser;
  onViewProfile: () => void;
  onBan: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function UserCard({ user, onViewProfile, onBan, colors }: UserCardProps) {
  return (
    <View style={[styles.userCard, { backgroundColor: colors.card }]}>
      <View style={styles.userInfo}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={[styles.username, { color: colors.text }]}>@{user.username}</Text>
          <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
            {user.total_picks} picks • Joined {formatDate(user.created_at)}
          </Text>
          {user.report_count > 0 && (
            <View style={styles.reportBadge}>
              <Ionicons name="flag" size={12} color={colors.accent} />
              <Text style={[styles.reportCount, { color: colors.accent }]}>
                {user.report_count} report{user.report_count !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}
          onPress={onViewProfile}
        >
          <Ionicons name="eye" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionIcon, { backgroundColor: colors.accent + '20' }]}
          onPress={onBan}
        >
          <Ionicons name="ban" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function UsersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: users, isLoading } = useAdminUserSearch(debouncedSearch);
  const banUser = useBanUser();

  // Debounce search with proper cleanup
  const handleSearch = useCallback((text: string) => {
    setSearchTerm(text);

    // Clear previous timeout to prevent stale updates
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 300);
  }, []);

  const handleViewProfile = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const handleBan = (user: AdminUser) => {
    Alert.alert(
      'Ban User',
      `Are you sure you want to ban @${user.username}? This action should only be taken for serious violations.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban User',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Ban Reason',
              'Enter the reason for banning this user:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Ban',
                  style: 'destructive',
                  onPress: async (reason: string | undefined) => {
                    if (!reason) {
                      Alert.alert('Error', 'A reason is required to ban a user.');
                      return;
                    }
                    try {
                      await banUser.mutateAsync({ userId: user.id, reason });
                      Alert.alert('User Banned', `@${user.username} has been banned.`);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to ban user. Please try again.');
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.textTertiary}
            value={searchTerm}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : users && users.length > 0 ? (
          <>
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {users.length} user{users.length !== 1 ? 's' : ''} found
            </Text>
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onViewProfile={() => handleViewProfile(user.id)}
                onBan={() => handleBan(user)}
                colors={colors}
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchTerm ? 'No users found' : 'Search for users by username'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    paddingVertical: spacing.xs,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  resultCount: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as '600',
  },
  userMeta: {
    fontSize: typography.sizes.sm,
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  reportCount: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium as '500',
  },
  userActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
