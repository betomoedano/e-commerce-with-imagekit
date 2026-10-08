import { StatusBar } from 'expo-status-bar';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RemotePhoto } from '@/components/product-media';
import type { MediaAsset } from '@/data/media';
import {
  comparisonPanelUrl,
  GENERATED_BACKGROUND_PROMPT,
  PHOTO_COMPARISON,
  type ComparisonPanel,
} from '@/data/photo-views';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

const viewer = {
  background: '#111511',
  text: '#F4F3EE',
  muted: '#A3A99F',
  line: 'rgba(244, 243, 238, 0.22)',
};

/**
 * Full-screen view of one comparison panel at full resolution. Switch panels
 * at the bottom; pinch, drag, or double-tap to look closer.
 */
export function PhotoViewer({
  photo,
  productName,
  visible,
  panelKey,
  onSelect,
  onClose,
}: {
  photo: MediaAsset;
  productName: string;
  visible: boolean;
  panelKey: ComparisonPanel['key'];
  onSelect: (key: ComparisonPanel['key']) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const panel = PHOTO_COMPARISON.find((item) => item.key === panelKey) ?? PHOTO_COMPARISON[0];
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      {/* A modal renders outside the app's root view, so gestures need their own root. */}
      <GestureHandlerRootView
        style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>
            {panel.label}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        {/* Keyed by panel so switching starts back at the full photo. */}
        <ZoomablePhoto
          key={panel.key}
          uri={comparisonPanelUrl(photo, panel)}
          label={`${productName}, ${panel.label.toLowerCase()}`}
        />
        <Text style={styles.hint}>Pinch or double-tap to zoom</Text>
        <View accessibilityRole="tablist" style={styles.tabs}>
          {PHOTO_COMPARISON.map((item) => {
            const selected = item.key === panel.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => onSelect(item.key)}
                style={({ pressed }) => [
                  styles.tab,
                  selected && styles.tabSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.prompt}>
          {panel.key === 'generated'
            ? `Prompt: “${GENERATED_BACKGROUND_PROMPT}”`
            : panel.key === 'removed'
              ? 'Background removed by ImageKit AI.'
              : 'The stored photo, exactly as uploaded.'}
        </Text>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomablePhoto({ uri, label }: { uri: string; label: string }) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const frameWidth = useSharedValue(0);
  const frameHeight = useSharedValue(0);

  // Keeps the zoomed photo over the frame instead of sliding off it.
  function clampTranslation() {
    'worklet';
    const maxX = (frameWidth.get() * (scale.get() - 1)) / 2;
    const maxY = (frameHeight.get() * (scale.get() - 1)) / 2;
    translateX.set(clamp(translateX.get(), -maxX, maxX));
    translateY.set(clamp(translateY.get(), -maxY, maxY));
  }

  const pinch = usePinchGesture({
    onUpdate: (event) => {
      'worklet';
      scale.set(clamp(scale.get() * event.scaleChange, 1, MAX_SCALE));
      clampTranslation();
    },
  });
  const pan = usePanGesture({
    onUpdate: (event) => {
      'worklet';
      if (scale.get() <= 1) return;
      translateX.set(translateX.get() + event.changeX);
      translateY.set(translateY.get() + event.changeY);
      clampTranslation();
    },
  });
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      scale.set(withTiming(scale.get() > 1 ? 1 : DOUBLE_TAP_SCALE));
      translateX.set(withTiming(0));
      translateY.set(withTiming(0));
    },
  });
  const pinchAndPan = useSimultaneousGestures(pinch, pan);
  const gesture = useExclusiveGestures(doubleTap, pinchAndPan);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.frame}
        onLayout={(event) => {
          frameWidth.set(event.nativeEvent.layout.width);
          frameHeight.set(event.nativeEvent.layout.height);
        }}
      >
        <Animated.View style={[styles.zoom, zoomStyle]}>
          <RemotePhoto uri={uri} label={label} contentFit="contain" />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: viewer.background, paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  title: { flex: 1, color: viewer.text, fontSize: 17, fontWeight: '600' },
  close: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: viewer.line,
  },
  closeText: { color: viewer.text, fontSize: 14, fontWeight: '600' },
  frame: { flex: 1, overflow: 'hidden' },
  zoom: { flex: 1 },
  hint: { color: viewer.muted, fontSize: 12, textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: viewer.line,
  },
  tabSelected: { backgroundColor: viewer.text, borderColor: viewer.text },
  tabText: { color: viewer.muted, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  tabTextSelected: { color: viewer.background, fontWeight: '600' },
  // Room for two lines, so the switcher stays put when the note changes length.
  prompt: { color: viewer.muted, fontSize: 12, lineHeight: 18, minHeight: 36, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
