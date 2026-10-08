import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PhotoComparison } from '@/components/photo-comparison';
import { ProductMedia, productMediaLabel } from '@/components/product-media';
import { ProductVideo } from '@/components/product-video';
import { BackButton, Eyebrow, Page, ui } from '@/components/store-ui';
import { displayFont, monoFont, palette } from '@/constants/store-theme';
import { useProducts } from '@/context/products-context';
import {
  GENERATED_BACKGROUND_PROMPT,
  isStoredRasterPhoto,
  PHOTO_VIEWS,
  type PhotoView,
} from '@/data/photo-views';
import { formatPrice } from '@/data/products';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProduct, products } = useProducts();
  const product = getProduct(id);
  const wide = useWindowDimensions().width >= 850;
  const [viewKey, setViewKey] = useState<PhotoView['key']>('full');

  if (!product) {
    return (
      <Page narrow>
        <BackButton />
        <View style={styles.missing}>
          <Text style={ui.sectionTitle}>Product not found</Text>
          <Text style={ui.body}>
            This product is no longer in the demo collection. Products you add are reset when the
            app reloads.
          </Text>
          <Link href="/" style={styles.homeLink}>
            Back to the collection →
          </Link>
        </View>
      </Page>
    );
  }

  const related = products.filter((item) => item.id !== product.id).slice(0, 2);
  const viewIndex = Math.max(
    PHOTO_VIEWS.findIndex((view) => view.key === viewKey),
    0,
  );
  const view = PHOTO_VIEWS[viewIndex];
  return (
    <Page>
      <View style={styles.topbar}>
        <BackButton />
        <Eyebrow>form & field</Eyebrow>
      </View>
      <View style={[styles.main, wide && styles.mainWide]}>
        <View style={styles.mediaColumn}>
          {product.photo ? (
            <>
              <ProductMedia
                placeholder={product.placeholder}
                photo={product.photo}
                transformation={view.transformation}
                label={`${product.name}, ${view.caption.toLowerCase()}`}
                style={styles.heroMedia}
              />
              {/* Every view is the same photo; ImageKit renders each from its URL. */}
              <View accessibilityRole="tablist" style={styles.viewPicker}>
                {PHOTO_VIEWS.map((item) => {
                  const selected = item.key === view.key;
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="tab"
                      accessibilityLabel={item.caption}
                      accessibilityState={{ selected }}
                      onPress={() => setViewKey(item.key)}
                      style={({ pressed }) => [styles.viewOption, pressed && styles.pressed]}
                    >
                      <ProductMedia
                        placeholder={product.placeholder}
                        photo={product.photo}
                        transformation={item.transformation}
                        label={`${product.name}, ${item.caption.toLowerCase()}`}
                        style={[styles.viewThumb, selected && styles.viewThumbSelected]}
                      />
                      <Text style={[styles.viewLabel, selected && styles.viewLabelSelected]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.mediaCaption}>
                {String(viewIndex + 1).padStart(2, '0')} / {view.caption.toUpperCase()}
              </Text>
              <Text selectable style={styles.transformation}>
                tr={view.transformation}
              </Text>
            </>
          ) : (
            <>
              <ProductMedia
                placeholder={product.placeholder}
                label={productMediaLabel(product)}
                style={styles.heroMedia}
              />
              <Text style={styles.mediaCaption}>01 / PRODUCT PREVIEW</Text>
            </>
          )}
        </View>
        <View style={styles.info}>
          <Eyebrow>{product.category} · The everyday collection</Eyebrow>
          <Text accessibilityRole="header" style={styles.title}>
            {product.name}
          </Text>
          <Text style={styles.price}>
            {formatPrice(product.price)} <Text style={styles.currency}>USD</Text>
          </Text>
          <Text style={ui.body}>{product.description}</Text>
          <View style={styles.specs}>
            <View style={ui.row}>
              <Text style={styles.specLabel}>Color</Text>
              <Text style={styles.specValue}>{product.colorName}</Text>
            </View>
            <View style={ui.row}>
              <Text style={styles.specLabel}>Material</Text>
              <Text style={styles.specValue}>{product.material}</Text>
            </View>
          </View>
          <View style={styles.demoBadge}>
            <View style={styles.dot} />
            <Text style={styles.demoText}>Part of our demo collection</Text>
          </View>
        </View>
      </View>
      {isStoredRasterPhoto(product.photo) && (
        <View style={styles.comparisonSection}>
          <Text accessibilityRole="header" style={ui.sectionTitle}>
            Photo comparison
          </Text>
          <Text style={ui.body}>
            The stored photo next to two AI edits made from it. Tap one to look closer.
          </Text>
          <PhotoComparison photo={product.photo} productName={product.name} />
          <Text style={styles.prompt}>Prompt: “{GENERATED_BACKGROUND_PROMPT}”</Text>
        </View>
      )}
      <View style={styles.videoSection}>
        <Text accessibilityRole="header" style={ui.sectionTitle}>
          A closer look
        </Text>
        <Text style={ui.body}>Every detail has a story.</Text>
        <ProductVideo product={product} />
      </View>
      {related.length > 0 && (
        <View style={styles.related}>
          <Text accessibilityRole="header" style={ui.sectionTitle}>
            In good company
          </Text>
          {related.map((item) => (
            <Link
              key={item.id}
              href={{ pathname: '/product/[id]', params: { id: item.id } }}
              asChild
            >
              <Pressable style={styles.relatedRow}>
                <ProductMedia
                  placeholder={item.placeholder}
                  photo={item.photo}
                  label={productMediaLabel(item)}
                  style={styles.thumbnail}
                />
                <View style={styles.relatedText}>
                  <Text style={styles.relatedName}>{item.name}</Text>
                  <Text style={styles.specLabel}>{formatPrice(item.price)}</Text>
                </View>
                <Text style={styles.arrow}>↗</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  main: { gap: 28 },
  mainWide: { flexDirection: 'row', gap: 48, alignItems: 'center' },
  mediaColumn: { flex: 1 },
  heroMedia: { width: '100%', aspectRatio: 1 },
  viewPicker: { flexDirection: 'row', gap: 10, marginTop: 12 },
  viewOption: { flex: 1, alignItems: 'center', gap: 6 },
  viewThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  viewThumbSelected: { borderColor: palette.ink },
  viewLabel: { color: palette.muted, fontSize: 12 },
  viewLabelSelected: { color: palette.ink, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  mediaCaption: {
    color: palette.muted,
    fontSize: 9,
    letterSpacing: 1.6,
    marginTop: 12,
    textAlign: 'center',
  },
  transformation: {
    color: palette.muted,
    fontFamily: monoFont,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
    textAlign: 'center',
  },
  info: { flex: 1, gap: 20 },
  title: {
    color: palette.ink,
    fontFamily: displayFont,
    fontSize: 40,
    lineHeight: 45,
    letterSpacing: -1.4,
  },
  price: { color: palette.ink, fontSize: 26, fontWeight: '500' },
  currency: { color: palette.muted, fontSize: 12, fontWeight: '400' },
  specs: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
    paddingVertical: 20,
    gap: 18,
  },
  specLabel: { color: palette.muted, fontSize: 13 },
  specValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  demoBadge: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#70815C' },
  demoText: { color: palette.muted, fontSize: 12 },
  comparisonSection: { gap: 10, marginTop: 40 },
  prompt: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  videoSection: { gap: 10, marginTop: 40 },
  related: { gap: 14, marginTop: 36 },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: palette.line,
  },
  thumbnail: { width: 70, height: 76, borderRadius: 10 },
  relatedText: { flex: 1, gap: 6 },
  relatedName: { color: palette.ink, fontSize: 15, fontWeight: '500' },
  arrow: { color: palette.ink, fontSize: 22 },
  missing: { gap: 18, paddingVertical: 48 },
  homeLink: { color: palette.ink, fontWeight: '600', fontSize: 16, paddingVertical: 12 },
});
