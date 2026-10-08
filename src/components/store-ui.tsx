import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { contentWidth, palette } from '@/constants/store-theme';

export function Page({ children, narrow = false }: PropsWithChildren<{ narrow?: boolean }>) {
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={[styles.content, narrow && styles.narrow]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <Text style={styles.backArrow}>←</Text>
      <Text style={styles.backLabel}>Back</Text>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  /** Blocks presses and dims the button, e.g. while its action is in flight. */
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

export function Eyebrow({ children }: PropsWithChildren) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  body: { color: palette.muted, fontSize: 16, lineHeight: 25 },
  sectionTitle: { color: palette.ink, fontSize: 21, fontWeight: '600', letterSpacing: -0.4 },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: contentWidth, padding: 24, paddingBottom: 48 },
  narrow: { maxWidth: 660 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingRight: 16,
  },
  backArrow: { color: palette.ink, fontSize: 24 },
  backLabel: { color: palette.ink, fontSize: 14, fontWeight: '500' },
  pressed: { opacity: 0.65 },
  button: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: palette.ink,
    borderRadius: 100,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  secondary: { backgroundColor: palette.accent },
  secondaryText: { color: palette.ink },
  eyebrow: {
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 16,
  },
});
