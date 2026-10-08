# form & field

A fictional storefront built with React Native, Expo, and Expo Router for the ImageKit tutorial. This is the application skeleton: a small product catalog and the screens needed to introduce an image and video workflow.

## Run locally

```bash
bun install
bun start
```

Use the Expo terminal shortcuts to open the app on your preferred target. For the web preview, run:

```bash
bun run web
```

## Included

- A responsive catalog with search and category filters.
- Three fictional products: Everyday Tote ($48), Studio Headphones ($129), and Trail Bottle ($32).
- Product detail screens with descriptions, product specifications, related products, and a video placeholder.
- An add-product form that previews a chosen JPG or PNG photo, falls back to the category placeholder, and updates the in-memory catalog.

Product data lives in `src/data/products.ts`. `ProductsProvider` in `src/context/products-context.tsx` owns the catalog state. Added products are **not persisted**: reloading the app restores the original three products.

## Media integration

The product illustrations are local SVG placeholders in `assets/products/`. `ProductMedia` in `src/components/product-media.tsx` centralizes image rendering for the catalog, detail screen, and form preview: it draws a product's photo when there is one and falls back to the category illustration. It is the starting point for the upcoming ImageKit image integration. The detail screen also reserves a place for a product video.

The add-product form picks a photo with `expo-image-picker` and stores it as a `MediaAsset` (`src/data/media.ts`). That record's fields mirror the ImageKit upload response, so a finished upload can fill in `fileId` and `filePath` and swap `url` from the on-device file to the hosted one. `Product` carries optional `photo` and `video` references built on the same type.

ImageKit uploads, AI image transformations, video overlays, and video streaming are intentionally not implemented yet. No ImageKit credentials are required to run this skeleton.

Checkout, payments, and inventory management are outside this demo's scope.

## Checks

```bash
bunx tsc --noEmit
bunx expo lint
```

Native device behavior should be checked on the intended recording device before production.
