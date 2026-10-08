import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type { MediaAsset } from '@/data/media';
import { seedProducts, type NewProductInput, type Product } from '@/data/products';

interface ProductsContextValue {
  products: Product[];
  addProduct: (input: NewProductInput) => Product;
  getProduct: (id: string) => Product | undefined;
  /** Sets or replaces the product's video with an uploaded `MediaAsset`. */
  attachVideo: (id: string, video: MediaAsset) => void;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

let productSequence = 0;

function createProductId(): string {
  productSequence += 1;
  return `product-${Date.now().toString(36)}-${productSequence.toString(36)}`;
}

// This starter stores products in memory. Reloading the app restores the seeds.
// A persisted catalog and media upload integration can replace this layer later.
export function ProductsProvider({ children }: PropsWithChildren) {
  const [products, setProducts] = useState<Product[]>(() =>
    seedProducts.map((product) => ({ ...product })),
  );

  const addProduct = useCallback((input: NewProductInput): Product => {
    const product: Product = { ...input, id: createProductId() };
    setProducts((currentProducts) => [product, ...currentProducts]);
    return product;
  }, []);

  const attachVideo = useCallback((id: string, video: MediaAsset) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) => (product.id === id ? { ...product, video } : product)),
    );
  }, []);

  const getProduct = useCallback(
    (id: string) => products.find((product) => product.id === id),
    [products],
  );

  const value = useMemo(
    () => ({ products, addProduct, getProduct, attachVideo }),
    [products, addProduct, getProduct, attachVideo],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsContextValue {
  const context = useContext(ProductsContext);

  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider.');
  }

  return context;
}
