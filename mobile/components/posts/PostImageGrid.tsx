/**
 * PostImageGrid - Adaptive image grid for posts
 *
 * Smart grid layouts based on image count:
 * - 1 image: Dynamic height based on aspect ratio (clamped)
 * - 2 images: Side by side
 * - 3 images: Large left + 2 stacked right
 * - 4 images: 2x2 grid
 */

import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../lib/theme';
import { radius, spacing } from '../../lib/tokens';
import type { PostImage } from '../../types/posts';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTENT_WIDTH = SCREEN_WIDTH - 40 - spacing.md * 2 - spacing.sm; // Account for avatar + padding
const GRID_GAP = 4;

// Aspect ratio bounds for single images
const MIN_ASPECT_RATIO = 0.5;  // Tallest allowed (2:1 portrait)
const MAX_ASPECT_RATIO = 2.5;  // Widest allowed (2.5:1 landscape)
const DEFAULT_ASPECT_RATIO = 1.5; // Default if unknown (3:2 landscape)

// Cache for image dimensions to avoid repeated Image.getSize calls
const imageDimensionsCache = new Map<string, { width: number; height: number; aspectRatio: number }>();

/**
 * Get cached image dimensions or fetch and cache them
 */
function getCachedImageDimensions(
  url: string,
  onSuccess: (dims: { width: number; height: number; aspectRatio: number }) => void,
  onError: () => void
): void {
  const cached = imageDimensionsCache.get(url);
  if (cached) {
    onSuccess(cached);
    return;
  }

  Image.getSize(
    url,
    (width, height) => {
      const dims = { width, height, aspectRatio: width / height };
      imageDimensionsCache.set(url, dims);
      onSuccess(dims);
    },
    onError
  );
}

interface PostImageGridProps {
  images: PostImage[];
  onImagePress?: (index: number) => void;
  /** Compact mode for feed with slightly reduced heights */
  compact?: boolean;
}

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export function PostImageGrid({ images, onImagePress, compact = false }: PostImageGridProps) {
  const { colors } = useTheme();
  const [firstImageDimensions, setFirstImageDimensions] = useState<ImageDimensions | null>(null);

  if (!images || images.length === 0) return null;

  // Sort by display_order
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  const count = Math.min(sortedImages.length, 4);
  const firstImageUrl = sortedImages[0]?.image_url;

  const handlePress = useCallback((index: number) => {
    onImagePress?.(index);
  }, [onImagePress]);

  // Fetch dimensions for single image to calculate dynamic height (with caching)
  useEffect(() => {
    if (count === 1 && firstImageUrl) {
      getCachedImageDimensions(
        firstImageUrl,
        (dims) => setFirstImageDimensions(dims),
        () => setFirstImageDimensions({ width: 3, height: 2, aspectRatio: DEFAULT_ASPECT_RATIO })
      );
    }
  }, [count, firstImageUrl]);

  // Calculate dynamic height for single image based on aspect ratio
  const getSingleImageHeight = (): number => {
    if (!firstImageDimensions) {
      // Default height while loading
      return compact ? 200 : 250;
    }

    // Clamp aspect ratio to reasonable bounds
    const clampedRatio = Math.max(MIN_ASPECT_RATIO, Math.min(MAX_ASPECT_RATIO, firstImageDimensions.aspectRatio));

    // Calculate height based on content width and clamped aspect ratio
    const calculatedHeight = CONTENT_WIDTH / clampedRatio;

    // Apply min/max bounds
    const minHeight = compact ? 150 : 180;
    const maxHeight = compact ? 350 : 400;

    return Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
  };

  // Multi-image heights (these stay fixed for consistent grid layouts)
  const twoImageHeight = compact ? 180 : 220;
  const threeImageHeight = compact ? 200 : 240;
  const fourImageRowHeight = compact ? 100 : 120;

  const containerStyle = compact ? styles.containerCompact : styles.container;

  // Single image - dynamic height based on aspect ratio
  if (count === 1) {
    const height = getSingleImageHeight();
    const isPortrait = firstImageDimensions && firstImageDimensions.aspectRatio < 1;

    return (
      <View style={[containerStyle, { borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => handlePress(0)}
          activeOpacity={0.9}
          disabled={!onImagePress}
          accessibilityRole="image"
          accessibilityLabel="Post image"
        >
          <Image
            source={{ uri: sortedImages[0].image_url }}
            style={[
              styles.singleImage,
              {
                height,
                backgroundColor: colors.surfaceAlt,
              }
            ]}
            resizeMode={isPortrait ? "contain" : "cover"}
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Two images - side by side
  if (count === 2) {
    return (
      <View style={[containerStyle, styles.twoImageContainer, { height: twoImageHeight, borderColor: colors.border }]}>
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
      <View style={[containerStyle, styles.threeImageContainer, { height: threeImageHeight, borderColor: colors.border }]}>
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
    <View style={[containerStyle, { borderColor: colors.border }]}>
      <View style={[styles.fourImageRow, { height: fourImageRowHeight }]}>
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
      <View style={[styles.fourImageRow, { height: fourImageRowHeight }]}>
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
  containerCompact: {
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
  },

  // Single image
  singleImage: {
    width: '100%',
    // height set dynamically via style prop
  },

  // Two images
  twoImageContainer: {
    flexDirection: 'row',
    // height set dynamically via style prop
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
    // height set dynamically via style prop
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
    // height set dynamically via style prop
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
