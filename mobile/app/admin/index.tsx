/**
 * Admin Dashboard
 *
 * Overview of app stats and quick access to moderation tools.
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useAdminStats } from '../../hooks/useAdmin';
import { spacing, radius, typography } from '../../lib/tokens';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function StatCard({ title, value, icon, color, colors }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );
}

interface QuickActionProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function QuickAction({ title, subtitle, icon, badge, onPress, colors }: QuickActionProps) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.actionLeft}>
        <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.actionText}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.actionRight}>
        {badge !== undefined && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: stats, isLoading, refetch } = useAdminStats();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Users"
          value={stats?.total_users ?? '-'}
          icon="people"
          color="#3B82F6"
          colors={colors}
        />
        <StatCard
          title="Active (24h)"
          value={stats?.active_users_24h ?? '-'}
          icon="pulse"
          color="#10B981"
          colors={colors}
        />
        <StatCard
          title="Total Picks"
          value={stats?.total_picks ?? '-'}
          icon="clipboard"
          color="#8B5CF6"
          colors={colors}
        />
        <StatCard
          title="Events"
          value={stats?.total_events ?? '-'}
          icon="calendar"
          color="#F59E0B"
          colors={colors}
        />
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Moderation</Text>

      <QuickAction
        title="Reports"
        subtitle="Review user reports"
        icon="flag"
        badge={stats?.pending_reports}
        onPress={() => router.push('/admin/reports')}
        colors={colors}
      />

      <QuickAction
        title="Users"
        subtitle="Search and manage users"
        icon="person-circle"
        onPress={() => router.push('/admin/users')}
        colors={colors}
      />

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>Live Operations</Text>

      <QuickAction
        title="Live Scorecards"
        subtitle="Control round state for live fights"
        icon="stats-chart"
        onPress={() => router.push('/admin/scorecards')}
        colors={colors}
      />

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Admin actions are logged. Use moderation tools responsibly.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as '700',
  },
  statTitle: {
    fontSize: typography.sizes.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as '600',
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    gap: 2,
  },
  actionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium as '500',
  },
  actionSubtitle: {
    fontSize: typography.sizes.sm,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
});
