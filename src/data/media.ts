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
 * Frame ImageKit extracts from a hosted video, for a poster image.
 * https://imagekit.io/docs/create-video-thumbnails
 */
export function videoThumbnail(video: MediaAsset): MediaAsset {
  return { ...video, url: `${video.url.split('?')[0]}/ik-thumbnail.jpg`, mediaType: 'image' };
}
