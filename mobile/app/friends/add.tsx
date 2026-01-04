/**
 * Add Friend screen - search users by username
 * Theme-aware design with SurfaceCard and animations
 */

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { EmptyState, SurfaceCard, Button } from '../../components/ui';
import type { UserSearchResult } from '../../types/social';

export default function AddFriend() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { searchUsers, sendFriendRequest, sendFriendRequestLoading } = useFriends();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 60);
  }, [headerOpacity, contentOpacity, contentTranslate]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      toast.showError('Please enter a username to search');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSearching(true);
    setHasSearched(true);

    try {
      const results = await searchUsers(searchTerm.trim());
      setSearchResults(results);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, searchUsers, toast]);

  const handleSendRequest = async (user: UserSearchResult) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPendingRequests((prev) => new Set(prev).add(user.user_id));

      await sendFriendRequest(user.user_id);

      toast.showSuccess(`Friend request sent to ${user.username}!`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update local state to reflect the pending request
      setSearchResults((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id ? { ...u, friendship_status: 'pending' } : u
        )
      );
    } catch (error: any) {
      toast.showError(error.message || 'Failed to send friend request');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPendingRequests((prev) => {
        const next = new Set(prev);
        next.delete(user.user_id);
        return next;
      });
    }
  };

  const getButtonConfig = (user: UserSearchResult) => {
    if (user.friendship_status === 'accepted') {
      return { label: 'Friends', disabled: true, bgColor: colors.success };
    }
    if (user.friendship_status === 'pending') {
      return { label: 'Pending', disabled: true, bgColor: colors.textTertiary };
    }
    return { label: 'Add', disabled: false, bgColor: colors.accent };
  };

  const renderUserItem = (user: UserSearchResult, index: number) => {
    const buttonConfig = getButtonConfig(user);
    const isLoading = pendingRequests.has(user.user_id);

    return (
      <Animated.View
        key={user.user_id}
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslate }],
        }}
      >
        <SurfaceCard weakWash style={{ marginBottom: spacing.sm }}>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={styles.avatarText}>
                {user.username.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user.username}</Text>
              <Text style={[styles.userStats, { color: colors.textSecondary }]}>
                {user.accuracy.toFixed(1)}% accuracy • {user.total_picks} picks
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: buttonConfig.bgColor }]}
              onPress={() => handleSendRequest(user)}
              disabled={buttonConfig.disabled || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>{buttonConfig.label}</Text>
              )}
            </TouchableOpacity>
          </View>
        </SurfaceCard>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <Animated.View style={{ opacity: headerOpacity }}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Friend</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by username..."
              placeholderTextColor={colors.textTertiary}
              value={searchTerm}
              onChangeText={setSearchTerm}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.accent }]}
            onPress={handleSearch}
            disabled={isSearching}
            activeOpacity={0.8}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Results */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <>
            <Text style={[styles.resultsLabel, { color: colors.textTertiary }]}>
              {searchResults.length} user{searchResults.length !== 1 ? 's' : ''} found
            </Text>
            {searchResults.map((user, index) => renderUserItem(user, index))}
          </>
        ) : hasSearched ? (
          <EmptyState
            icon="person-outline"
            title="No Users Found"
            message={`No users match "${searchTerm}". Try a different username.`}
          />
        ) : (
          <EmptyState
            icon="search-outline"
            title="Find Friends"
            message="Search for friends by their username to send them a friend request."
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  searchContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.meta,
  },
  resultsLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  userStats: {
    ...typography.meta,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
