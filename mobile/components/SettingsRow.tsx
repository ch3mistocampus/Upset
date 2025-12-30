/**
 * SettingsRow Component
 * Reusable row for settings items
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SettingsRowType = 'button' | 'toggle' | 'link' | 'danger';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  type?: SettingsRowType;
  value?: boolean; // For toggle type
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  subtitle?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  label,
  type = 'button',
  value,
  onPress,
  onToggle,
  subtitle,
}) => {
  const isDanger = type === 'danger';
  const isLink = type === 'link';

  const handlePress = () => {
    if (type !== 'toggle' && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={handlePress}
      disabled={type === 'toggle'}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, isDanger && styles.dangerIcon]}>
        <Ionicons
          name={icon}
          size={22}
          color={isDanger ? '#ef4444' : '#fff'}
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, isDanger && styles.dangerLabel]}>
          {label}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {type === 'toggle' && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#333', true: '#d4202a' }}
          thumbColor={value ? '#fff' : '#999'}
          ios_backgroundColor="#333"
        />
      )}

      {(type === 'button' || type === 'link' || type === 'danger') && (
        <Ionicons
          name={isLink ? 'open-outline' : 'chevron-forward'}
          size={20}
          color={isDanger ? '#ef4444' : '#666'}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dangerLabel: {
    color: '#ef4444',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
