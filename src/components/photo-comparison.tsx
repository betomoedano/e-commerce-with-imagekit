import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoViewer } from '@/components/photo-viewer';
import { RemotePhoto } from '@/components/product-media';
import { palette } from '@/constants/store-theme';
import type { MediaAsset } from '@/data/media';
import { comparisonPanelUrl, PHOTO_COMPARISON, type ComparisonPanel } from '@/data/photo-views';

const TILE_WIDTH = 600;

/**
 * The stored photo next to two AI edits of it. Every tile uses the photo's own
 * aspect ratio and `contain`, so nothing is cropped and the framing lines up.
 * Tapping a tile opens it full screen.
 */
export function PhotoComparison({ photo, productName }: { photo: MediaAsset; productName: string }) {
  const [viewer, setViewer] = useState<{ open: boolean; panelKey: ComparisonPanel['key'] }>({
    open: false,
    panelKey: 'generated',
  });
  const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 1;
  return (
    <>
      <View style={styles.row}>
        {PHOTO_COMPARISON.map((panel) => (
          <Pressable
            key={panel.key}
            accessibilityRole="button"
            accessibilityLabel={`${panel.label}, view larger`}
            onPress={() => setViewer({ open: true, panelKey: panel.key })}
            style={({ pressed }) => [styles.panel, pressed && styles.pressed]}
          >
            <View
              style={[styles.tile, panel.key === 'removed' && styles.cutoutTile, { aspectRatio }]}
            >
              <RemotePhoto
                // The original is the untouched upload, the reference for the edits.
                uri={comparisonPanelUrl(photo, panel, TILE_WIDTH)}
                label={`${productName}, ${panel.label.toLowerCase()}`}
                contentFit="contain"
              />
            </View>
            <Text style={styles.label}>{panel.label}</Text>
          </Pressable>
        ))}
      </View>
      <PhotoViewer
        photo={photo}
        productName={productName}
        visible={viewer.open}
        panelKey={viewer.panelKey}
        onSelect={(panelKey) => setViewer({ open: true, panelKey })}
        onClose={() => setViewer((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, maxWidth: 560 },
  panel: { flex: 1, gap: 6 },
  tile: { overflow: 'hidden', borderRadius: 10, backgroundColor: palette.surface },
  // A tint behind the transparent cutout so the removed background reads as removed.
  cutoutTile: { backgroundColor: '#E3E6DE' },
  label: { color: palette.muted, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
