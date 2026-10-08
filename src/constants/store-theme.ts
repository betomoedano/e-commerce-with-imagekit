import { Platform } from 'react-native';

export const palette = {
  background: '#F8F7F3',
  surface: '#FFFFFF',
  ink: '#24382D',
  muted: '#71776E',
  line: '#DFE2D8',
  accent: '#DDE8C8',
  error: '#A33428',
};

export const displayFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, serif',
});
export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  web: 'ui-monospace, Menlo, monospace',
});
export const contentWidth = 1120;
