import type { MediaAsset } from '@/data/media';

export const PRODUCT_CATEGORIES = ['Bags', 'Audio', 'Drinkware'] as const;

export const PRODUCT_PLACEHOLDERS = ['tote', 'headphones', 'bottle'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductPlaceholder = (typeof PRODUCT_PLACEHOLDERS)[number];

export const PLACEHOLDER_BY_CATEGORY: Record<ProductCategory, ProductPlaceholder> = {
  Bags: 'tote',
  Audio: 'headphones',
  Drinkware: 'bottle',
};

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  description: string;
  colorName: string;
  material: string;
  /** Drawn from local artwork whenever the product has no photo of its own. */
  placeholder: ProductPlaceholder;
  /** Set once a photo is chosen for the product. */
  photo?: MediaAsset;
  /** Set once a video is uploaded from the detail screen, which shows a placeholder until then. */
  video?: MediaAsset;
}

export type NewProductInput = Omit<Product, 'id'>;

// Fictional products with photos hosted in ImageKit. The local artwork stays as
// the fallback for any product without a photo.
export const seedProducts: Product[] = [
  {
    id: 'everyday-tote',
    name: 'Everyday Tote',
    price: 48,
    category: 'Bags',
    description:
      'An easy companion for market mornings, work days, and everything in between. Roomy enough for the essentials, with a soft shape that goes wherever you do.',
    colorName: 'Natural canvas',
    material: 'Cotton canvas',
    placeholder: 'tote',
    photo: {
      fileId: '6ac7c1c2ead997d09ad7007d',
      filePath: '/products/6AC7AB0C-6B76-4C86-8B03-5D9BADE4A3BC_UKmxO9jBj.jpeg',
      url: 'https://ik.imagekit.io/cwb/products/6AC7AB0C-6B76-4C86-8B03-5D9BADE4A3BC_UKmxO9jBj.jpeg',
      mediaType: 'image',
      width: 1200,
      height: 1800,
    },
  },
  {
    id: 'studio-headphones',
    name: 'Studio Headphones',
    price: 129,
    category: 'Audio',
    description:
      'Make a little room for your favorite sounds. Soft ear cushions and a simple, comfortable fit turn a daily playlist into a moment of your own.',
    colorName: 'Moss green',
    material: 'Soft-touch finish',
    placeholder: 'headphones',
    photo: {
      fileId: '6ac7c255ead997d09ad918c1',
      filePath: '/products/986B6A0F-D4C2-48F1-9CA7-C95DBFB35266_Khj0_t1HB.jpeg',
      url: 'https://ik.imagekit.io/cwb/products/986B6A0F-D4C2-48F1-9CA7-C95DBFB35266_Khj0_t1HB.jpeg',
      mediaType: 'image',
      width: 1200,
      height: 800,
    },
  },
  {
    id: 'trail-bottle',
    name: 'Trail Bottle',
    price: 32,
    category: 'Drinkware',
    description:
      'From the desk to the trail, keep your daily ritual close. A reusable bottle with a clean silhouette, an easy carry loop, and a finish that feels good in hand.',
    colorName: 'Terracotta',
    material: 'Stainless steel',
    placeholder: 'bottle',
    photo: {
      fileId: '6ac7c239ead997d09ad8b6fc',
      filePath: '/products/520F33EF-5341-453F-8749-E464C46CF65E_mZr88Q4mr.jpeg',
      url: 'https://ik.imagekit.io/cwb/products/520F33EF-5341-453F-8749-E464C46CF65E_mZr88Q4mr.jpeg',
      mediaType: 'image',
      width: 1200,
      height: 1800,
    },
  },
];

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(price: number): string {
  return priceFormatter.format(price).replace(/\.00$/, '');
}
