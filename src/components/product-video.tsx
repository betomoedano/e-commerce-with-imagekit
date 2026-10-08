import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductMedia } from '@/components/product-media';
import { palette } from '@/constants/store-theme';
import { useProducts } from '@/context/products-context';
import {
  isAcceptedVideoMimeType,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  photoFormatLabel,
  resolveVideoMimeType,
  videoThumbnail,
} from '@/data/media';
import type { Product } from '@/data/products';
import { uploadProductMedia } from '@/data/upload-media';

type VideoError = { message: string; offerSettings?: boolean };

/**
 * The detail screen's video slot. Picks a short MP4, uploads it through
 * `/api/upload`, and attaches the hosted `MediaAsset` to the product.
 */
export function ProductVideo({ product }: { product: Product }) {
  const { attachVideo } = useProducts();
  const [status, setStatus] = useState<'idle' | 'picking' | 'uploading'>('idle');
  const [error, setError] = useState<VideoError | null>(null);
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();
  const busy = useRef(false);
  const { video } = product;

  async function pickAndUploadVideo() {
    if (busy.current) return;
    busy.current = true;
    // Upload errors carry a message for the UI; anything earlier gets a generic one.
    let uploading = false;
    setStatus('picking');
    setError(null);
    try {
      // Skip the prompt once access is granted; requesting again when it is not
      // returns the current answer, including a permanent denial.
      const permission = libraryPermission?.granted
        ? libraryPermission
        : await requestLibraryPermission();
      if (!permission.granted) {
        setError(
          permission.canAskAgain
            ? { message: 'We need access to your library before you can choose a video.' }
            : { message: 'Photo access is turned off for this app.', offerSettings: true },
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
      });
      // Backing out of the picker leaves the current video untouched.
      if (result.canceled) return;
      const [asset] = result.assets;
      if (!asset) {
        setError({ message: 'That video could not be read. Please try another one.' });
        return;
      }
      const mimeType = resolveVideoMimeType(asset);
      if (!isAcceptedVideoMimeType(mimeType)) {
        const format = photoFormatLabel(mimeType);
        setError({
          message: format
            ? `${format} videos are not supported yet. Choose an MP4 instead.`
            : 'Choose an MP4 video.',
        });
        return;
      }
      // `duration` is in milliseconds. Platforms that omit it are checked by size only.
      if (asset.duration && Math.round(asset.duration / 1000) > MAX_VIDEO_SECONDS) {
        setError({ message: `Choose a video that is ${MAX_VIDEO_SECONDS} seconds or shorter.` });
        return;
      }
      if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
        setError({ message: 'Videos must be 50 MB or smaller.' });
        return;
      }

      uploading = true;
      setStatus('uploading');
      // The product keeps the hosted ImageKit copy, not the on-device file.
      const uploaded = await uploadProductMedia({
        uri: asset.uri,
        fileName: asset.fileName ?? 'product.mp4',
        mimeType,
      });
      attachVideo(product.id, uploaded);
    } catch (caught) {
      // Log the underlying failure; the UI shows the friendly message.
      console.warn(
        '[product-video] Adding the video failed.',
        caught instanceof Error && caught.cause ? caught.cause : caught,
      );
      setError({
        message:
          uploading && caught instanceof Error
            ? caught.message
            : 'Something went wrong adding your video. Please try again.',
      });
    } finally {
      busy.current = false;
      setStatus('idle');
    }
  }

  async function openSettings() {
    try {
      await Linking.openSettings();
    } catch {
      setError({ message: 'Allow photo access for this app in your device settings.' });
    }
  }

  const actionLabel =
    status === 'picking'
      ? 'Opening…'
      : status === 'uploading'
        ? 'Uploading video…'
        : video
          ? 'Replace video'
          : 'Add video';

  return (
    <View style={styles.section}>
      {video ? (
        // Plays the hosted MP4 in the system browser until the app has a player.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${product.name} video`}
          onPress={() => WebBrowser.openBrowserAsync(video.url)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <ProductMedia
            placeholder={product.placeholder}
            photo={videoThumbnail(video)}
            label={`${product.name} video poster`}
            style={styles.frame}
          />
          <View style={styles.playBadge}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </Pressable>
      ) : (
        <View style={[styles.frame, styles.placeholder]}>
          <View style={styles.filmIcon}>
            <View style={styles.filmLens} />
          </View>
          <Text style={styles.videoTitle}>Product video</Text>
          <Text style={styles.videoNote}>
            No video added yet · MP4, up to {MAX_VIDEO_SECONDS} seconds
          </Text>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={video ? 'Replace video' : 'Add video'}
        accessibilityState={{ busy: status !== 'idle', disabled: status !== 'idle' }}
        disabled={status !== 'idle'}
        onPress={pickAndUploadVideo}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={[styles.actionText, status !== 'idle' && styles.actionTextBusy]}>
          {actionLabel}
        </Text>
      </Pressable>
      {error && (
        <View style={styles.errorBlock}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error.message}
          </Text>
          {error.offerSettings && (
            <Pressable
              accessibilityRole="button"
              onPress={openSettings}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            >
              <Text style={styles.actionText}>Open settings →</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 10, gap: 12 },
  frame: { width: '100%', aspectRatio: 16 / 9, minHeight: 160, maxHeight: 340 },
  placeholder: {
    backgroundColor: '#EBEDE5',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  filmIcon: {
    width: 35,
    height: 27,
    borderWidth: 1.5,
    borderColor: '#85907B',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmLens: { width: 9, height: 9, borderWidth: 1.5, borderColor: '#85907B', borderRadius: 5 },
  videoTitle: { color: palette.ink, fontSize: 14, fontWeight: '500' },
  videoNote: { color: palette.muted, fontSize: 12 },
  playBadge: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: palette.ink,
    fontSize: 20,
    lineHeight: 56,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  actionText: { color: palette.ink, fontSize: 13, fontWeight: '600' },
  actionTextBusy: { color: palette.muted },
  pressed: { opacity: 0.65 },
  errorBlock: { gap: 6 },
  error: { color: palette.error, fontSize: 12, lineHeight: 18 },
  settingsButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
});
