import type { ImagePickerAsset } from 'expo-image-picker';

export const MEDIA_TYPES = ['image', 'video'] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

/**
 * One stored piece of product media. The field names mirror the ImageKit upload
 * response so a finished upload can be saved without reshaping it.
 */
export interface MediaAsset {
  /** Provider id for the stored file. Empty while the pick is still on-device. */
  fileId: string;
  /** Provider path, such as `/products/weekend-tote.jpg`. Empty while the pick is still on-device. */
  filePath: string;
  /** What to render: the local `file://` or `blob:` URI before upload, the hosted URL after. */
  url: string;
  mediaType: MediaType;
  /** Omitted when the platform does not report a size. */
  width?: number;
  height?: number;
}

/** The form previews and uploads JPG and PNG photos only. */
export const ACCEPTED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export type AcceptedPhotoMimeType = (typeof ACCEPTED_PHOTO_MIME_TYPES)[number];

export const PHOTO_FORMAT_LABELS: Record<AcceptedPhotoMimeType, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
};

/** Product videos are short MP4 clips. */
export const ACCEPTED_VIDEO_MIME_TYPES = ['video/mp4'] as const;

export type AcceptedVideoMimeType = (typeof ACCEPTED_VIDEO_MIME_TYPES)[number];

export type AcceptedMediaMimeType = AcceptedPhotoMimeType | AcceptedVideoMimeType;

/** Shared by the picker check and the upload route. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 30;

function fileExtension(value: string | null | undefined): string | undefined {
  const match = value?.split(/[?#]/)[0]?.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase();
}

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

/**
 * Resolves a picked asset's file type. `mimeType` is not reported on every
 * platform, so fall back to the file name and then to the URI.
 */
function resolveMimeType(asset: ImagePickerAsset, mediaType: MediaType): string | undefined {
  if (asset.mimeType) return normalizeMimeType(asset.mimeType);
  const extension = fileExtension(asset.fileName) ?? fileExtension(asset.uri);
  return extension ? normalizeMimeType(`${mediaType}/${extension}`) : undefined;
}

export function resolvePhotoMimeType(asset: ImagePickerAsset): string | undefined {
  return resolveMimeType(asset, 'image');
}

export function resolveVideoMimeType(asset: ImagePickerAsset): string | undefined {
  return resolveMimeType(asset, 'video');
}

export function isAcceptedPhotoMimeType(
  mimeType: string | undefined,
): mimeType is AcceptedPhotoMimeType {
  return (
    mimeType !== undefined && (ACCEPTED_PHOTO_MIME_TYPES as readonly string[]).includes(mimeType)
  );
}

export function isAcceptedVideoMimeType(
  mimeType: string | undefined,
): mimeType is AcceptedVideoMimeType {
  return (
    mimeType !== undefined && (ACCEPTED_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType)
  );
}

/** Short format name for the preview tag, and for naming an unsupported pick. */
export function photoFormatLabel(mimeType: string | undefined): string | undefined {
  if (isAcceptedPhotoMimeType(mimeType)) return PHOTO_FORMAT_LABELS[mimeType];
  const subtype = mimeType?.split('/')[1];
  return subtype ? subtype.toUpperCase() : undefined;
}

/**
 * Wraps a picked photo as a local `MediaAsset`. `fileId` and `filePath` stay
 * empty until the file is uploaded, and `url` points at the on-device copy so
 * the form can preview the photo first. The picker reports a dimension as `0`
 * when the system does not provide one, so those are left off.
 */
export function photoAssetFromPick(asset: ImagePickerAsset): MediaAsset {
  return {
    fileId: '',
    filePath: '',
    url: asset.uri,
    mediaType: 'image',
    ...(asset.width > 0 && { width: asset.width }),
    ...(asset.height > 0 && { height: asset.height }),
  };
}

/**
 * Encodes text for ImageKit's `ie-` (and `prompte-`) parameters: Base64 of the
 * UTF-8 bytes, then percent-encoded. Needed for anything beyond letters,
 * digits, `@`, `-` and `_`, including spaces.
 */
export function encodeImageKitText(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return encodeURIComponent(btoa(binary));
}

/**
 * One ImageKit text layer, `l-text,…,l-end`. Usable in image, MP4 and HLS
 * requests. https://imagekit.io/docs/add-overlays-on-videos
 */
export function textLayer(text: string, style: readonly string[]): string {
  return ['l-text', `ie-${encodeImageKitText(text)}`, ...style, 'l-end'].join(',');
}

/**
 * "Made by Beto". Font size and padding scale with the video's height (`bh`),
 * the 70% dark backing keeps white text readable on light scenes, and
 * `lx-N24,ly-N24` pins it 24px inside the bottom-right corner, so it stays in
 * frame at any size.
 */
export const MADE_BY_BETO_LAYER = textLayer('Made by Beto', [
  'fs-bh_div_16',
  'co-FFFFFF',
  'bg-11151170',
  'pa-bh_div_50',
  'r-max',
  'tg-b',
  'lx-N24',
  'ly-N24',
]);

/** Layers burned into every product video, its poster, and its HLS stream. */
export const VIDEO_LAYERS: readonly string[] = [MADE_BY_BETO_LAYER];

const videoLayers = VIDEO_LAYERS.join(',');

function videoSourceUrl(video: MediaAsset): string {
  return video.url.split('?')[0];
}

/**
 * Progressive MP4 with the video layers. Until ImageKit finishes a new
 * transformation it redirects to the original, so playback never waits on it.
 */
export function videoPlaybackUrl(video: MediaAsset): string {
  return `${videoSourceUrl(video)}?tr=${videoLayers}`;
}

/** Heights ImageKit's `sr` accepts. https://imagekit.io/docs/adaptive-bitrate-streaming */
const HLS_RENDITIONS = [240, 360, 480, 720, 1080, 1440, 2160] as const;

/** Phones gain nothing above 1080p, even full screen. */
const MAX_HLS_RENDITION = 1080;

/**
 * Renditions up to the source's shorter side, so nothing is upscaled: a
 * 1280×720 video gets 240, 360, 480 and 720. A source under 240p still gets
 * 240, since `sr` needs one. Sizes are known for every upload; without
 * them, assume 720p.
 */
export function hlsRenditions(video: MediaAsset): number[] {
  const shortSide = video.width && video.height ? Math.min(video.width, video.height) : 720;
  const limit = Math.min(shortSide, MAX_HLS_RENDITION);
  const fitting = HLS_RENDITIONS.filter((height) => height <= limit);
  return fitting.length > 0 ? fitting : [HLS_RENDITIONS[0]];
}

/**
 * HLS master manifest for adaptive streaming, from the same source video.
 * Only layers and `sr` go here: streaming requests reject base transforms
 * (`w`, `h`, `ar`, `f`, `vc`, `ac`, `q`). The layers run as their own step
 * before `sr`. ImageKit rejects them in the same step, and labeling the source
 * first scales the label evenly into every rendition. A new video answers 202
 * while its renditions are prepared.
 */
export function videoHlsUrl(video: MediaAsset): string {
  return `${videoSourceUrl(video)}/ik-master.m3u8?tr=${videoLayers}:sr-${hlsRenditions(video).join('_')}`;
}

/**
 * Frame ImageKit extracts from a hosted video, for a poster image. It carries
 * the same layers as playback, so the poster and first frame match.
 * https://imagekit.io/docs/create-video-thumbnails
 */
export function videoThumbnail(video: MediaAsset): MediaAsset {
  return {
    ...video,
    url: `${videoSourceUrl(video)}/ik-thumbnail.jpg?tr=${videoLayers}`,
    mediaType: 'image',
  };
}
