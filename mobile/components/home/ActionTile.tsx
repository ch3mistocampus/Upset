/**
 * ActionTile - Quick action tile for home screen grid
 * Pressable surface with icon and label
 */

import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ActionTileProps {
  icon: IoniconsName;
  label: string;
  onPress?: () => void;
}

export function ActionTile({ icon, label, onPress }: ActionTileProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface ActionTileGridProps {
  children: React.ReactNode;
}

export function ActionTileGrid({ children }: ActionTileGridProps) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm + 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
