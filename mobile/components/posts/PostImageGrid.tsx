/**
 * PostImageGrid - Twitter-style image grid for posts
 *
 * Smart grid layouts based on image count:
 * - 1 image: Full width
 * - 2 images: Side by side
 * - 3 images: Large left + 2 stacked right
 * - 4 images: 2x2 grid
 */

import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../lib/theme';
import { radius, spacing } from '../../lib/tokens';
import type { PostImage } from '../../types/posts';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 4;

interface PostImageGridProps {
  images: PostImage[];
  onImagePress?: (index: number) => void;
}

export function PostImageGrid({ images, onImagePress }: PostImageGridProps) {
  const { colors } = useTheme();

  if (!images || images.length === 0) return null;

  // Sort by display_order
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  const count = Math.min(sortedImages.length, 4);

  const handlePress = (index: number) => {
    onImagePress?.(index);
  };

  // Single image - full width
  if (count === 1) {
    return (
      <View style={[styles.container, { borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => handlePress(0)}
          activeOpacity={0.9}
          disabled={!onImagePress}
          accessibilityRole="image"
          accessibilityLabel="Post image"
        >
          <Image
            source={{ uri: sortedImages[0].image_url }}
            style={[styles.singleImage, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Two images - side by side
  if (count === 2) {
    return (
      <View style={[styles.container, styles.twoImageContainer, { borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => handlePress(0)}
          activeOpacity={0.9}
          disabled={!onImagePress}
          style={styles.twoImageLeft}
          accessibilityRole="image"
          accessibilityLabel="Post image 1 of 2"
        >
          <Image
            source={{ uri: sortedImages[0].image_url }}
            style={[styles.twoImage, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handlePress(1)}
          activeOpacity={0.9}
          disabled={!onImagePress}
          style={styles.twoImageRight}
          accessibilityRole="image"
          accessibilityLabel="Post image 2 of 2"
        >
          <Image
            source={{ uri: sortedImages[1].image_url }}
            style={[styles.twoImage, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Three images - large left + 2 stacked right
  if (count === 3) {
    return (
      <View style={[styles.container, styles.threeImageContainer, { borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => handlePress(0)}
          activeOpacity={0.9}
          disabled={!onImagePress}
          style={styles.threeImageLeft}
          accessibilityRole="image"
          accessibilityLabel="Post image 1 of 3"
        >
          <Image
            source={{ uri: sortedImages[0].image_url }}
            style={[styles.threeImageLarge, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <View style={styles.threeImageRightColumn}>
          <TouchableOpacity
            onPress={() => handlePress(1)}
            activeOpacity={0.9}
            disabled={!onImagePress}
            style={styles.threeImageRightTop}
            accessibilityRole="image"
            accessibilityLabel="Post image 2 of 3"
          >
            <Image
              source={{ uri: sortedImages[1].image_url }}
              style={[styles.threeImageSmall, { backgroundColor: colors.surfaceAlt }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handlePress(2)}
            activeOpacity={0.9}
            disabled={!onImagePress}
            style={styles.threeImageRightBottom}
            accessibilityRole="image"
            accessibilityLabel="Post image 3 of 3"
          >
            <Image
              source={{ uri: sortedImages[2].image_url }}
              style={[styles.threeImageSmall, { backgroundColor: colors.surfaceAlt }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Four images - 2x2 grid
  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.fourImageRow}>
        <TouchableOpacity
          onPress={() => handlePress(0)}
          activeOpacity={0.9}
          disabled={!onImagePress}
          style={styles.fourImageTopLeft}
          accessibilityRole="image"
          accessibilityLabel="Post image 1 of 4"
        >
          <Image
            source={{ uri: sortedImages[0].image_url }}
            style={[styles.fourImage, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handlePress(1)}
          activeOpacity={0.9}
          disabled={!onImagePress}
          style={styles.fourImageTopRight}
          accessibilityRole="image"
          accessibilityLabel="Post image 2 of 4"
        >
          <Image
            source={{ uri: sortedImages[1].image_url }}
            style={[styles.fourImage, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
      <View style={styles.fourImageRow}>
        <TouchableOpacity
          onPress={() => handlePress(2)}
          activeOpacity={0.9}
          disabled={!onImagePress}
          style={styles.fourImageBottomLeft}
          accessibilityRole="image"
          accessibilityLabel="Post image 3 of 4"
        >
          <Image
            source={{ uri: sortedImages[2].image_url }}
            style={[styles.fourImage, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handlePress(3)}
          activeOpacity={0.9}
          disabled={!onImagePress}
          style={styles.fourImageBottomRight}
          accessibilityRole="image"
          accessibilityLabel="Post image 4 of 4"
        >
          <Image
            source={{ uri: sortedImages[3].image_url }}
            style={[styles.fourImage, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
  },

  // Single image
  singleImage: {
    width: '100%',
    height: 200,
  },

  // Two images
  twoImageContainer: {
    flexDirection: 'row',
    height: 180,
  },
  twoImageLeft: {
    flex: 1,
    marginRight: GRID_GAP / 2,
  },
  twoImageRight: {
    flex: 1,
    marginLeft: GRID_GAP / 2,
  },
  twoImage: {
    width: '100%',
    height: '100%',
  },

  // Three images
  threeImageContainer: {
    flexDirection: 'row',
    height: 200,
  },
  threeImageLeft: {
    flex: 2,
    marginRight: GRID_GAP / 2,
  },
  threeImageLarge: {
    width: '100%',
    height: '100%',
  },
  threeImageRightColumn: {
    flex: 1,
    marginLeft: GRID_GAP / 2,
  },
  threeImageRightTop: {
    flex: 1,
    marginBottom: GRID_GAP / 2,
  },
  threeImageRightBottom: {
    flex: 1,
    marginTop: GRID_GAP / 2,
  },
  threeImageSmall: {
    width: '100%',
    height: '100%',
  },

  // Four images
  fourImageRow: {
    flexDirection: 'row',
    height: 100,
  },
  fourImageTopLeft: {
    flex: 1,
    marginRight: GRID_GAP / 2,
    marginBottom: GRID_GAP / 2,
  },
  fourImageTopRight: {
    flex: 1,
    marginLeft: GRID_GAP / 2,
    marginBottom: GRID_GAP / 2,
  },
  fourImageBottomLeft: {
    flex: 1,
    marginRight: GRID_GAP / 2,
    marginTop: GRID_GAP / 2,
  },
  fourImageBottomRight: {
    flex: 1,
    marginLeft: GRID_GAP / 2,
    marginTop: GRID_GAP / 2,
  },
  fourImage: {
    width: '100%',
    height: '100%',
  },
});
