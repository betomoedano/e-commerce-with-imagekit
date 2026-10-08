import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { ProductMedia, productMediaLabel } from '@/components/product-media';
import { Button, Eyebrow, Page, ui } from '@/components/store-ui';
import { contentWidth, displayFont, palette } from '@/constants/store-theme';
import { useProducts } from '@/context/products-context';
import { formatPrice, PRODUCT_CATEGORIES, type ProductCategory } from '@/data/products';

export default function StorefrontScreen() {
  const { products } = useProducts();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState<ProductCategory | 'All'>('All');
  const [search, setSearch] = useState('');
  const columns = width >= 850 ? 3 : 2;
  const availableWidth = Math.min(width, contentWidth) - 48;
  const cardWidth = (availableWidth - (columns - 1) * 16) / columns;
  const filtered = products.filter(
    (product) =>
      (category === 'All' || category === product.category) &&
      [product.name, product.category]
        .join(' ')
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandDot} />
          <Text style={styles.wordmark}>form & field</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/add-product')}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Text style={styles.addText}>＋ Add product</Text>
        </Pressable>
      </View>
      <View style={styles.hero}>
        <Eyebrow>Objects for the everyday</Eyebrow>
        <Text accessibilityRole="header" style={[styles.title, width >= 850 && styles.largeTitle]}>
          Good things.{'\n'}Every day.
        </Text>
        <Text style={[ui.body, styles.heroCopy]}>
          A little less, a little better. Thoughtful essentials for wherever the day takes you.
        </Text>
        <View style={styles.collectionTag}>
          <View style={styles.tagDot} />
          <Text style={styles.tagText}>THE EVERYDAY COLLECTION</Text>
        </View>
        <View
          style={styles.heroNumber}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.issue}>01</Text>
        </View>
      </View>
      <View style={styles.collectionHeader}>
        <View style={ui.row}>
          <Text accessibilityRole="header" style={ui.sectionTitle}>
            The collection
          </Text>
          <Text style={styles.count}>{products.length} products</Text>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search the collection"
          accessibilityLabel="Search products"
          placeholderTextColor={palette.muted}
          style={styles.search}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <View style={styles.filters}>
        {(['All', ...PRODUCT_CATEGORIES] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            onPress={() => setCategory(item)}
            style={[styles.filter, category === item && styles.filterActive]}
          >
            <Text style={[styles.filterLabel, category === item && styles.filterLabelActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.grid}>
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={{ pathname: '/product/[id]', params: { id: product.id } }}
            asChild
          >
            <Pressable
              accessibilityLabel={'View ' + product.name + ', ' + formatPrice(product.price)}
              style={StyleSheet.flatten([{ width: cardWidth }, styles.card])}
            >
              <View>
                <ProductMedia
                  placeholder={product.placeholder}
                  photo={product.photo}
                  label={productMediaLabel(product)}
                />
                <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>ESSENTIAL</Text>
                </View>
              </View>
              <Text style={styles.category}>
                {product.category} / {product.colorName}
              </Text>
              <Text style={styles.productName}>{product.name}</Text>
              <View style={ui.row}>
                <Text style={styles.price}>{formatPrice(product.price)}</Text>
                <Text style={styles.cardArrow}>↗</Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
      {filtered.length === 0 && (
        <View style={styles.empty}>
          <Text style={ui.sectionTitle}>Nothing here just yet.</Text>
          <Text style={ui.body}>Try another search or browse the full collection.</Text>
          <Button
            secondary
            title="Show all products"
            onPress={() => {
              setSearch('');
              setCategory('All');
            }}
          />
        </View>
      )}
      <View style={styles.footer}>
        <View style={styles.footerMark}>
          <Text style={styles.footerPlus}>✳</Text>
          <Text style={styles.footerTitle}>Made for the everyday.</Text>
        </View>
        <Text style={styles.footerNote}>A small collection. A little inspiration.</Text>
        <Text style={styles.demoNote}>Demo storefront · Placeholder products</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 24,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  brandDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: palette.ink,
    transform: [{ rotate: '45deg' }],
  },
  wordmark: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.7,
    flexShrink: 1,
  },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: palette.ink,
    borderRadius: 30,
  },
  addText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  hero: {
    backgroundColor: palette.accent,
    padding: 26,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 32,
  },
  title: {
    fontFamily: displayFont,
    fontSize: 45,
    lineHeight: 48,
    letterSpacing: -2,
    color: palette.ink,
    marginTop: 17,
    marginBottom: 18,
    zIndex: 1,
  },
  largeTitle: { fontSize: 68, lineHeight: 70 },
  heroCopy: { maxWidth: 390, color: '#52614B', fontSize: 14, lineHeight: 22, zIndex: 1 },
  collectionTag: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 24, zIndex: 1 },
  tagDot: { width: 5, height: 5, backgroundColor: palette.ink, borderRadius: 3 },
  tagText: { fontSize: 9, fontWeight: '600', letterSpacing: 1.3, color: palette.ink },
  heroNumber: {
    position: 'absolute',
    right: 20,
    bottom: -20,
    opacity: 0.08,
    pointerEvents: 'none',
  },
  issue: {
    fontFamily: displayFont,
    color: palette.ink,
    fontSize: 170,
    lineHeight: 185,
    letterSpacing: -12,
  },
  collectionHeader: { gap: 18, marginBottom: 16 },
  count: { color: palette.muted, fontSize: 12 },
  search: {
    borderWidth: 1,
    borderColor: palette.line,
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 14,
    color: palette.ink,
    backgroundColor: palette.surface,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  filter: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: palette.line,
  },
  filterActive: { backgroundColor: palette.ink, borderColor: palette.ink },
  filterLabel: { color: palette.muted, fontSize: 12, fontWeight: '500' },
  filterLabelActive: { color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 28 },
  card: { gap: 6 },
  imageBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FFFFFFC9',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  imageBadgeText: { color: palette.ink, fontSize: 7, fontWeight: '600', letterSpacing: 1 },
  category: { marginTop: 7, color: palette.muted, fontSize: 10, lineHeight: 16 },
  productName: { color: palette.ink, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  price: { color: palette.ink, fontSize: 14 },
  cardArrow: { color: palette.ink, fontSize: 19 },
  pressed: { opacity: 0.65 },
  empty: { paddingVertical: 36, gap: 16, alignItems: 'flex-start' },
  footer: { borderTopWidth: 1, borderColor: palette.line, paddingTop: 26, marginTop: 38, gap: 8 },
  footerMark: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  footerPlus: { color: palette.ink, fontSize: 28 },
  footerTitle: { fontFamily: displayFont, color: palette.ink, fontSize: 21 },
  footerNote: { color: palette.muted, fontSize: 12 },
  demoNote: { color: palette.muted, fontSize: 10, marginTop: 16 },
});
