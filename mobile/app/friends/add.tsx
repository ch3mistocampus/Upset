/**
 * Add Friend screen - search users by username
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
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../hooks/useToast';
import { EmptyState } from '../../components/EmptyState';
import type { UserSearchResult } from '../../types/social';

export default function AddFriend() {
  const router = useRouter();
  const toast = useToast();
  const { searchUsers, sendFriendRequest, sendFriendRequestLoading } = useFriends();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      toast.showError('Please enter a username to search');
      return;
    }

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

  const getButtonState = (user: UserSearchResult) => {
    if (user.friendship_status === 'accepted') {
      return { label: 'Friends', disabled: true, style: styles.friendsButton };
    }
    if (user.friendship_status === 'pending') {
      return { label: 'Pending', disabled: true, style: styles.pendingButton };
    }
    return { label: 'Add', disabled: false, style: styles.addButton };
  };

  const renderUserItem = (user: UserSearchResult) => {
    const buttonState = getButtonState(user);
    const isLoading = pendingRequests.has(user.user_id);

    return (
      <View key={user.user_id} style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.username.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.username}</Text>
          <Text style={styles.userStats}>
            {user.accuracy.toFixed(1)}% accuracy • {user.total_picks} picks
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, buttonState.style]}
          onPress={() => handleSendRequest(user)}
          disabled={buttonState.disabled || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>{buttonState.label}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Friend</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            placeholderTextColor="#666"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#d4202a" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <>
            <Text style={styles.resultsLabel}>
              {searchResults.length} user{searchResults.length !== 1 ? 's' : ''} found
            </Text>
            {searchResults.map(renderUserItem)}
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
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#1a1a1a',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#d4202a',
    borderRadius: 10,
    paddingHorizontal: 20,
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
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  resultsLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d4202a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 13,
    color: '#999',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#d4202a',
  },
  pendingButton: {
    backgroundColor: '#666',
  },
  friendsButton: {
    backgroundColor: '#22c55e',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
