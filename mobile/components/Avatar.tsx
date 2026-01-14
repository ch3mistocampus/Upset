/**
 * Avatar component with expandable modal view
 * Displays user profile picture or initials fallback
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography } from '../lib/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AvatarProps {
  /** URL to the avatar image */
  imageUrl?: string | null;
  /** Username for initials fallback */
  username: string;
  /** Size of the avatar */
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  /** Whether the avatar is expandable on press */
  expandable?: boolean;
  /** Custom onPress handler (overrides expandable) */
  onPress?: () => void;
}

const SIZES = {
  small: 40,
  medium: 56,
  large: 80,
  xlarge: 120,
};

// Square with rounded corners (not circular)
const BORDER_RADII = {
  small: 10,
  medium: 14,
  large: 18,
  xlarge: 24,
};

const FONT_SIZES = {
  small: 16,
  medium: 22,
  large: 32,
  xlarge: 48,
};

export const Avatar: React.FC<AvatarProps> = ({
  imageUrl,
  username,
  size = 'medium',
  expandable = false,
  onPress,
}) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const avatarSize = SIZES[size];
  const borderRadius = BORDER_RADII[size];
  const fontSize = FONT_SIZES[size];
  const initials = username?.charAt(0).toUpperCase() || '?';

  const hasValidImage = imageUrl && !imageError;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (expandable && hasValidImage) {
      setModalVisible(true);
    }
  };

  const avatarContent = (
    <View
      style={[
        styles.avatar,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius,
          backgroundColor: hasValidImage ? colors.surfaceAlt : colors.accentSoft,
        },
      ]}
    >
      {hasValidImage ? (
        <>
          {imageLoading && (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={StyleSheet.absoluteFill}
            />
          )}
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.image,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius,
              },
            ]}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        </>
      ) : (
        <Text style={[styles.initials, { fontSize, color: colors.accent }]}>
          {initials}
        </Text>
      )}
    </View>
  );

  const isClickable = onPress || (expandable && hasValidImage);

  return (
    <>
      {isClickable ? (
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={expandable && hasValidImage ? styles.expandableHint : undefined}
        >
          {avatarContent}
          {expandable && hasValidImage && (
            <View style={[styles.expandIcon, { backgroundColor: colors.surface }]}>
              <Ionicons name="expand-outline" size={12} color={colors.textSecondary} />
            </View>
          )}
        </TouchableOpacity>
      ) : (
        avatarContent
      )}

      {/* Expanded Image Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.surface }]}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Username */}
            <Text style={[styles.modalUsername, { color: '#fff' }]}>
              {username}
            </Text>

            {/* Full Size Image */}
            {imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    fontWeight: '700',
  },
  expandableHint: {
    position: 'relative',
  },
  expandIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalUsername: {
    position: 'absolute',
    top: 68,
    left: 20,
    ...typography.h2,
    zIndex: 10,
  },
  fullImage: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: SCREEN_WIDTH - spacing.lg * 2,
    maxHeight: SCREEN_HEIGHT * 0.6,
    borderRadius: radius.card,
  },
});

export default Avatar;
