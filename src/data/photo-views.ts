import type { MediaAsset } from '@/data/media';

/** One way to present a product photo, rendered on the fly by ImageKit. */
export interface PhotoView {
  key: 'full' | 'closeup' | 'studio';
  /** Short name for the view picker. */
  label: string;
  /** Longer name for the caption under the selected view. */
  caption: string;
  /** ImageKit transformation, sent as the `tr` query parameter. */
  transformation: string;
}

// Each view is the same uploaded photo with a different transformation. Steps
// separated by `:` run in order. All three fill the square detail frame.
// https://imagekit.io/docs/image-transformation
export const PHOTO_VIEWS: readonly PhotoView[] = [
  {
    key: 'full',
    label: 'Full',
    caption: 'Full view',
    // Fit the whole photo and pad the edges with its dominant color.
    transformation: 'w-1000,h-1000,cm-pad_resize,bg-dominant',
  },
  {
    key: 'closeup',
    label: 'Close-up',
    caption: 'Close-up',
    // Cut out the most important half of the photo, then fill the square.
    transformation: 'cm-extract,w-0.5,h-0.5,fo-auto:w-1000,h-1000',
  },
  {
    key: 'studio',
    label: 'Studio',
    caption: 'Studio shot',
    // AI background removal and a drop shadow on white. The first request for a
    // new photo can take several seconds while ImageKit prepares it.
    transformation: 'e-bgremove:e-dropshadow:w-1000,h-1000,cm-pad_resize,bg-FFFFFF',
  },
];

/** Describes the backdrop for the generated-background comparison. Plain ASCII. */
export const GENERATED_BACKGROUND_PROMPT = 'warm cream studio background with a soft natural shadow';

/** One panel in the photo comparison. */
export interface ComparisonPanel {
  key: 'original' | 'removed' | 'generated';
  label: string;
  /** The AI edit. Omitted for the original, which is the stored photo exactly as uploaded. */
  transformation?: string;
}

// Each AI panel starts from the stored original, never from another panel, and
// keeps its framing. The prompt is passed Base64 encoded (`prompte-`) so commas
// or colons in it can't be read as transformation syntax.
// https://imagekit.io/docs/ai-transformations
export const PHOTO_COMPARISON: readonly ComparisonPanel[] = [
  { key: 'original', label: 'Original' },
  { key: 'removed', label: 'Background removed', transformation: 'e-bgremove' },
  {
    key: 'generated',
    label: 'Generated background',
    transformation: `e-changebg-prompte-${encodeURIComponent(btoa(GENERATED_BACKGROUND_PROMPT))}`,
  },
];

/**
 * URL for a comparison panel: the untouched original, or its AI edit at the
 * original's size. `width` shrinks the edit afterwards, e.g. for small tiles.
 */
export function comparisonPanelUrl(
  photo: MediaAsset,
  panel: ComparisonPanel,
  width?: number,
): string {
  if (!panel.transformation) return photo.url;
  return transformedPhotoUrl(
    photo,
    width ? `${panel.transformation}:w-${width}` : panel.transformation,
  );
}

const RASTER_PATH = /\.(jpe?g|png|webp|avif)$/i;

/** True for a photo stored in ImageKit as a raster image, which AI transformations need. */
export function isStoredRasterPhoto(photo: MediaAsset | undefined): photo is MediaAsset {
  return photo?.mediaType === 'image' && RASTER_PATH.test(photo.filePath);
}

/** The photo's hosted URL with an ImageKit transformation applied. */
export function transformedPhotoUrl(photo: MediaAsset, transformation: string): string {
  return `${photo.url}${photo.url.includes('?') ? '&' : '?'}tr=${transformation}`;
}
