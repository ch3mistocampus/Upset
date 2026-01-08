/**
 * Network Status Banner
 *
 * Shows a banner when:
 * - Device is offline
 * - There are pending scores to sync
 * - Syncing is in progress
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';
import { getPendingScores, useSyncPendingScores } from '../../hooks/useScorecard';
import { useToast } from '../../hooks/useToast';
import * as Haptics from 'expo-haptics';

interface NetworkStatusBannerProps {
  /** Only show when there are pending scores */
  onlyShowPending?: boolean;
}

export function NetworkStatusBanner({ onlyShowPending = false }: NetworkStatusBannerProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const [isConnected, setIsConnected] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-60))[0];

  const syncPendingScores = useSyncPendingScores();

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      setIsConnected(connected);

      // Auto-sync when coming back online
      if (connected && pendingCount > 0) {
        handleSync();
      }
    });

    return () => unsubscribe();
  }, [pendingCount]);

  // Check for pending scores periodically
  useEffect(() => {
    const checkPending = async () => {
      const pending = await getPendingScores();
      setPendingCount(pending.length);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => clearInterval(interval);
  }, []);

  // Show/hide banner with animation
  useEffect(() => {
    const shouldShow = !isConnected || pendingCount > 0;

    if (onlyShowPending && isConnected && pendingCount === 0) {
      setVisible(false);
    } else {
      setVisible(shouldShow);
    }

    Animated.spring(slideAnim, {
      toValue: shouldShow ? 0 : -60,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [isConnected, pendingCount, onlyShowPending]);

  const handleSync = useCallback(async () => {
    if (!isConnected || pendingCount === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await syncPendingScores.mutateAsync();
      if (result.synced > 0) {
        toast.showNeutral(`Synced ${result.synced} score${result.synced !== 1 ? 's' : ''}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (result.failed > 0) {
        toast.showError(`Failed to sync ${result.failed} score${result.failed !== 1 ? 's' : ''}`);
      }

      // Refresh pending count
      const pending = await getPendingScores();
      setPendingCount(pending.length);
    } catch (error) {
      toast.showError('Failed to sync scores');
    }
  }, [isConnected, pendingCount, syncPendingScores, toast]);

  if (!visible) return null;

  const bgColor = !isConnected ? colors.danger : colors.warning;
  const textColor = '#fff';

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!isConnected ? (
        // Offline state
        <View style={styles.content}>
          <Ionicons name="cloud-offline" size={18} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>
            You're offline
            {pendingCount > 0 && ` • ${pendingCount} score${pendingCount !== 1 ? 's' : ''} pending`}
          </Text>
        </View>
      ) : pendingCount > 0 ? (
        // Pending scores to sync
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Ionicons name="sync" size={18} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>
              {pendingCount} score{pendingCount !== 1 ? 's' : ''} pending sync
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={handleSync}
            disabled={syncPendingScores.isPending}
            activeOpacity={0.7}
          >
            {syncPendingScores.isPending ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : (
              <>
                <Ionicons name="refresh" size={14} color={textColor} />
                <Text style={[styles.syncButtonText, { color: textColor }]}>Sync Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NetworkStatusBanner;
