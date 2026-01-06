/**
 * Create Post Screen
 * Allows users to create new posts with title, body, and images
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
import { useState, useCallback } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/theme';
import { spacing, radius, typography } from '../../../lib/tokens';
import { useCreatePost } from '../../../hooks/usePosts';
import { useToast } from '../../../hooks/useToast';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;
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
  const toast = useToast();
  const createPost = useCreatePost();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && !isSubmitting && !images.some((i) => i.uploading);

  const handleClose = () => {
    if (title.trim() || body.trim() || images.length > 0) {
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

      // Upload the image
      try {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `posts/${fileName}`;

        // Read the file as blob
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
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

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (trimmedTitle.length === 0) {
      toast.showError('Title is required');
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      toast.showError(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
      return;
    }

    if (trimmedBody.length > MAX_BODY_LENGTH) {
      toast.showError(`Body must be ${MAX_BODY_LENGTH} characters or less`);
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
      const postId = await createPost.mutateAsync({
        title: trimmedTitle,
        body: trimmedBody || undefined,
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>New Post</Text>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.postButton,
            { backgroundColor: canSubmit ? colors.accent : colors.surfaceAlt },
          ]}
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.titleInput, { color: colors.text }]}
              placeholder="Title"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={MAX_TITLE_LENGTH}
              multiline
              autoFocus
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {title.length}/{MAX_TITLE_LENGTH}
            </Text>
          </View>

          {/* Body Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.bodyInput, { color: colors.text }]}
              placeholder="Share your thoughts... (optional)"
              placeholderTextColor={colors.textTertiary}
              value={body}
              onChangeText={setBody}
              maxLength={MAX_BODY_LENGTH}
              multiline
              textAlignVertical="top"
            />
            {body.length > 0 && (
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {body.length}/{MAX_BODY_LENGTH}
              </Text>
            )}
          </View>

          {/* Images */}
          {images.length > 0 && (
            <View style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View key={image.uri} style={styles.imageWrapper}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />

                  {image.uploading && (
                    <View style={styles.imageOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}

                  {image.error && (
                    <View style={[styles.imageOverlay, { backgroundColor: 'rgba(255,0,0,0.5)' }]}>
                      <Ionicons name="alert-circle" size={24} color="#fff" />
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(image.uri)}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add Image Button */}
          {images.length < MAX_IMAGES && (
            <TouchableOpacity
              style={[styles.addImageButton, { borderColor: colors.border }]}
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
              <Text style={[styles.addImageText, { color: colors.textSecondary }]}>
                Add Photo ({images.length}/{MAX_IMAGES})
              </Text>
            </TouchableOpacity>
          )}

          {/* Tips */}
          <View style={[styles.tipsContainer, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.tipsTitle, { color: colors.textSecondary }]}>Tips for a great post:</Text>
            <Text style={[styles.tipText, { color: colors.textTertiary }]}>
              • Use a clear, descriptive title
            </Text>
            <Text style={[styles.tipText, { color: colors.textTertiary }]}>
              • Share your analysis or predictions
            </Text>
            <Text style={[styles.tipText, { color: colors.textTertiary }]}>
              • Add images to make your post stand out
            </Text>
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
  },
  postButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    minWidth: 70,
    alignItems: 'center',
  },
  postButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  titleInput: {
    ...typography.h2,
    padding: 0,
    minHeight: 40,
  },
  bodyInput: {
    ...typography.body,
    padding: 0,
    minHeight: 120,
    lineHeight: 24,
  },
  charCount: {
    ...typography.meta,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  imageWrapper: {
    position: 'relative',
    width: '48%',
    aspectRatio: 16 / 9,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addImageText: {
    ...typography.body,
    fontWeight: '500',
  },
  tipsContainer: {
    padding: spacing.md,
    borderRadius: radius.card,
  },
  tipsTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  tipText: {
    ...typography.meta,
    marginBottom: spacing.xs,
  },
});
