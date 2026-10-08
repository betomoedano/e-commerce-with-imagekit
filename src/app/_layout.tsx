import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProductsProvider } from '@/context/products-context';
import { palette } from '@/constants/store-theme';

export default function RootLayout() {
  return (
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: palette.background },
      }}
    >
      <ProductsProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="add-product" />
        </Stack>
      </ProductsProvider>
    </ThemeProvider>
  );
}
