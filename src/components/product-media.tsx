import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { palette } from '@/constants/store-theme';
import type { MediaAsset } from '@/data/media';
import { transformedPhotoUrl } from '@/data/photo-views';
import type { ProductPlaceholder } from '@/data/products';

const media = {
  tote: { source: require('@/assets/products/tote.svg'), background: '#EEE7DB' },
  headphones: { source: require('@/assets/products/headphones.svg'), background: '#E5E9DF' },
  bottle: { source: require('@/assets/products/bottle.svg'), background: '#EFE0D6' },
} as const;

type Artwork = (typeof media)[ProductPlaceholder]['source'];

// While ImageKit prepares a new transformation, such as AI background removal,
// it answers with a short-lived "being prepared" response that fails to load as
// an image. Retrying for about a minute covers the preparation time.
const RETRY_DELAY_MS = 5000;
const MAX_ATTEMPTS = 12;

/** Keeps the accessibility label honest about what is on screen. */
export function productMediaLabel(product: { name: string; photo?: MediaAsset }): string {
  return product.photo ? `${product.name} photo` : `${product.name} placeholder illustration`;
}

// Shared by catalog, detail, and form previews. Renders the chosen photo when
// there is one, optionally through an ImageKit transformation, and falls back to
// the category artwork. This is the ImageKit integration point.
export function ProductMedia({
  placeholder,
  photo,
  transformation,
  label,
  style,
}: {
  placeholder: ProductPlaceholder;
  photo?: MediaAsset;
  /** ImageKit transformation for a hosted photo, e.g. `w-400,h-400`. */
  transformation?: string;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const item = media[placeholder];
  const uri = photo && (transformation ? transformedPhotoUrl(photo, transformation) : photo.url);
  return (
    <View style={[styles.frame, { backgroundColor: item.background }, style]}>
      {uri ? (
        // Keyed by URL so each photo or transformation starts with fresh retries.
        <RemotePhoto key={uri} uri={uri} artwork={item.source} label={label} />
      ) : (
        <Image
          source={item.source}
          contentFit="contain"
          style={styles.image}
          accessibilityLabel={label}
        />
      )}
    </View>
  );
}

/**
 * A hosted photo with a loading spinner and retries. If it never loads, shows
 * the artwork when given, or an "Unavailable" note.
 */
export function RemotePhoto({
  uri,
  artwork,
  label,
  contentFit = 'cover',
}: {
  uri: string;
  artwork?: Artwork;
  label: string;
  contentFit?: 'cover' | 'contain';
}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  function retryOrGiveUp() {
    if (attempt + 1 >= MAX_ATTEMPTS) {
      setStatus('failed');
      return;
    }
    retryTimer.current = setTimeout(() => setAttempt((count) => count + 1), RETRY_DELAY_MS);
  }

  if (status === 'failed') {
    return artwork ? (
      <Image source={artwork} contentFit="contain" style={styles.image} accessibilityLabel={label} />
    ) : (
      <View style={styles.unavailable}>
        <Text style={styles.unavailableText}>Unavailable</Text>
      </View>
    );
  }
  return (
    <>
      <Image
        // A new key remounts the image, which requests the URL again.
        key={attempt}
        source={{ uri }}
        contentFit={contentFit}
        style={styles.image}
        accessibilityLabel={label}
        onLoad={() => setStatus('loaded')}
        onError={retryOrGiveUp}
      />
      {status === 'loading' && (
        <ActivityIndicator
          color={palette.muted}
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Loading photo"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', aspectRatio: 0.94, borderRadius: 18 },
  image: { width: '100%', height: '100%' },
  unavailable: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: { color: palette.muted, fontSize: 11 },
});
