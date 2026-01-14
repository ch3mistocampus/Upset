/**
 * Home screen - Premium "Elite" design
 * Features: Greeting header, Featured Post, Quick Actions grid,
 * Next Event module with pick progress, Upset Ticker
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useNextEvent, useBoutsForEvent, useTickerData } from '../../hooks/useQueries';
import { usePostsFeed } from '../../hooks/usePosts';
import { useTheme } from '../../lib/theme';
import { useDrawer } from '../../lib/DrawerContext';
import { spacing, radius } from '../../lib/tokens';
import { EmptyState } from '../../components/ui';
import { SkeletonEventCard } from '../../components/SkeletonStats';
import { ErrorState } from '../../components/ErrorState';
import {
  FeaturedPostCard,
  ActionTile,
  ActionTileGrid,
  NextEventCard,
  UpsetTicker,
  type NextEvent,
} from '../../components/home';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, isGuest, profile } = useAuth();
  const { openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();

  const { data: nextEvent, isLoading: eventLoading, isError: eventError, refetch: refetchEvent } = useNextEvent();
  const { data: bouts, isLoading: boutsLoading, refetch: refetchBouts } = useBoutsForEvent(
    nextEvent?.id || null,
    user?.id || null,
    isGuest
  );
  const { data: postsData, refetch: refetchPosts } = usePostsFeed();
  const { data: tickerData, isLoading: tickerLoading, refetch: refetchTicker } = useTickerData();

  const [refreshing, setRefreshing] = useState(false);

  // Get featured post (first post from feed, sorted by engagement)
  const featuredPost = postsData?.pages?.[0]?.[0] || null;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvent(), refetchBouts(), refetchPosts(), refetchTicker()]);
    setRefreshing(false);
  };

  const picksCount = bouts?.filter((b) => b.pick).length || 0;
  const totalBouts = bouts?.length || 0;

  // Prepare next event data
  const nextEventData: NextEvent | null = nextEvent
    ? {
        id: nextEvent.id,
        title: nextEvent.name,
        venue: nextEvent.location || 'TBA',
        picksMade: picksCount,
        picksTotal: totalBouts,
      }
    : null;

  // Get display name
  const displayName = profile?.username || (isGuest ? 'Guest' : 'there');

  if (eventLoading || boutsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvasBg }]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openDrawer();
              }}
              style={styles.menuButton}
            >
              <Ionicons name="menu" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonEventCard />
          <SkeletonEventCard />
        </ScrollView>
      </View>
    );
  }

  if (eventError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvasBg }]}>
        <ErrorState
          message="Failed to load upcoming events. Check your connection and try again."
          onRetry={() => refetchEvent()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvasBg }]}>
      {/* Header with Avatar and Greeting */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {/* Left: Menu + Avatar + Greeting */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openDrawer();
            }}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={[styles.avatarContainer, { borderColor: colors.accent }]}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.avatarInitials, { color: colors.textSecondary }]}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={[styles.greetingTitle, { color: colors.text }]}>
              Hello, {displayName}
            </Text>
          </View>
        </View>

      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Featured Post */}
        {featuredPost && (
          <FeaturedPostCard
            post={featuredPost}
            onPress={() => router.push(`/post/${featuredPost.id}`)}
          />
        )}

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <ActionTileGrid>
            <ActionTile
              icon="megaphone-outline"
              label="Call the Fight"
              onPress={() => nextEvent && router.push(`/event/${nextEvent.id}`)}
            />
            <ActionTile
              icon="videocam-outline"
              label="Fighters"
              onPress={() => router.push('/fighters')}
            />
            <ActionTile
              icon="people-outline"
              label="The Crowd"
              onPress={() => router.push('/crowd')}
            />
            <ActionTile
              icon="trophy-outline"
              label="My Record"
              onPress={() => router.push('/my-record')}
            />
          </ActionTileGrid>
        </View>

        {/* Next Event */}
        {nextEventData ? (
          <View style={styles.section}>
            <NextEventCard
              event={nextEventData}
              onCallTheFight={() => router.push(`/event/${nextEvent?.id}`)}
            />
          </View>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No Upcoming Events"
            message="Check back soon for the next fight card."
          />
        )}

        {/* Community Picks Ticker */}
        <View style={styles.section}>
          <UpsetTicker items={tickerData || []} isLoading={tickerLoading} />
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
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
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  greetingContainer: {
    marginLeft: spacing.xs,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    // Sections are spaced by gap in content
  },
});
