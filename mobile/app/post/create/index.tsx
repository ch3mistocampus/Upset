/**
 * Create Post Screen - Twitter/X style compose
 *
 * Layout: Avatar on left, text input + images on right
 * Bottom toolbar with image picker
 */

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { decode } from 'base64-arraybuffer';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/theme';
import { spacing, radius, typography } from '../../../lib/tokens';
import { useCreatePost } from '../../../hooks/usePosts';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { Avatar } from '../../../components/Avatar';

const MAX_CONTENT_LENGTH = 5000;
const MAX_IMAGES = 4;

interface SelectedImage {
  uri: string;
  uploading: boolean;
  uploadedUrl?: string;
  error?: string;
}

export default function CreatePostScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const createPost = useCreatePost();
  const { user, profile } = useAuth();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = content.trim().length > 0 && !isSubmitting && !images.some((i) => i.uploading);

  const handleClose = () => {
    if (content.trim() || images.length > 0) {
      Alert.alert('Discard Post?', 'You have unsaved changes. Are you sure you want to discard this post?', [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]);
    } else {
      router.back();
    }
  };

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      toast.showError(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.showError('Permission to access photos is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newImage: SelectedImage = {
        uri: asset.uri,
        uploading: true,
      };

      setImages((prev) => [...prev, newImage]);

      // Upload the image - path must start with user ID for RLS policy
      try {
        if (!user?.id) {
          throw new Error('User not authenticated');
        }
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `${user.id}/${fileName}`;

        // Read file as base64 and decode for React Native compatibility
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
        const arrayBuffer = decode(base64);

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('post-images').getPublicUrl(filePath);

        setImages((prev) =>
          prev.map((img) =>
            img.uri === asset.uri ? { ...img, uploading: false, uploadedUrl: publicUrl } : img
          )
        );

        logger.debug('Image uploaded', { publicUrl });
      } catch (error: any) {
        logger.error('Failed to upload image', error);
        setImages((prev) =>
          prev.map((img) =>
            img.uri === asset.uri ? { ...img, uploading: false, error: 'Upload failed' } : img
          )
        );
        toast.showError('Failed to upload image');
      }
    }
  };

  const removeImage = (uri: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const trimmedContent = content.trim();

    if (trimmedContent.length === 0) {
      toast.showError('Post cannot be empty');
      return;
    }

    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      toast.showError(`Post must be ${MAX_CONTENT_LENGTH} characters or less`);
      return;
    }

    // Check for any failed uploads
    const failedImages = images.filter((img) => img.error);
    if (failedImages.length > 0) {
      toast.showError('Please remove failed images before posting');
      return;
    }

    // Get successfully uploaded image URLs
    const imageUrls = images
      .filter((img) => img.uploadedUrl)
      .map((img) => img.uploadedUrl!);

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Use full content as title (API expects title)
      const postId = await createPost.mutateAsync({
        title: trimmedContent,
        body: undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      toast.showSuccess('Post created!');
      router.replace(`/post/${postId}`);
    } catch (error: any) {
      logger.error('Failed to create post', error);
      toast.showError(error.message || 'Failed to create post');
      setIsSubmitting(false);
    }
  };

  const displayName = profile?.username || 'User';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerSpacer} />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.postButton,
            { backgroundColor: canSubmit ? colors.accent : colors.surfaceAlt },
          ]}
          accessibilityLabel="Post"
          accessibilityState={{ disabled: !canSubmit }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.postButtonText, { color: canSubmit ? '#fff' : colors.textTertiary }]}>
              Post
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Compose Area - Avatar left, content right */}
          <View style={styles.composeRow}>
            <View style={styles.avatarColumn}>
              <Avatar
                imageUrl={profile?.avatar_url}
                username={displayName}
                size="small"
              />
            </View>

            <View style={styles.contentColumn}>
              <TextInput
                style={[styles.contentInput, { color: colors.text }]}
                placeholder="What's happening?"
                placeholderTextColor={colors.textTertiary}
                value={content}
                onChangeText={setContent}
                maxLength={MAX_CONTENT_LENGTH}
                multiline
                autoFocus
                textAlignVertical="top"
              />

              {/* Images inline with content */}
              {images.length > 0 && (
                <View style={styles.imagesContainer}>
                  {images.map((image) => (
                    <View key={image.uri} style={[styles.imageWrapper, { borderColor: colors.border }]}>
                      <Image source={{ uri: image.uri }} style={styles.imagePreview} />

                      {image.uploading && (
                        <View style={styles.imageOverlay}>
                          <ActivityIndicator color="#fff" />
                        </View>
                      )}

                      {image.error && (
                        <View style={[styles.imageOverlay, styles.imageErrorOverlay]}>
                          <Ionicons name="alert-circle" size={24} color="#fff" />
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(image.uri)}
                        accessibilityLabel="Remove image"
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Toolbar */}
        <View style={[styles.toolbar, { borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm }]}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={pickImage}
            disabled={images.length >= MAX_IMAGES}
            accessibilityLabel="Add photo"
          >
            <Ionicons
              name="image-outline"
              size={22}
              color={images.length >= MAX_IMAGES ? colors.textTertiary : colors.accent}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  headerSpacer: {
    flex: 1,
  },
  postButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minWidth: 64,
    alignItems: 'center',
  },
  postButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  composeRow: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  avatarColumn: {
    width: 40,
    marginRight: spacing.sm,
  },
  contentColumn: {
    flex: 1,
  },
  contentInput: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 24,
    minHeight: 100,
    padding: 0,
  },
  imagesContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageErrorOverlay: {
    backgroundColor: 'rgba(220,53,69,0.6)',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarButton: {
    padding: spacing.xs,
  },
});
