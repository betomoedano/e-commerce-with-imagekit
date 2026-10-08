import { File as FileSystemFile } from 'expo-file-system';
import { Platform } from 'react-native';

import type { AcceptedMediaMimeType, MediaAsset } from '@/data/media';

export interface LocalMedia {
  /** The on-device `file://` URI, or a `blob:`/`data:` URI on web. */
  uri: string;
  /** Sent as the file name on web. Native sends the picked file's own name. */
  fileName: string;
  mimeType: AcceptedMediaMimeType;
}

/**
 * Sends a picked photo or video to the `/api/upload` route, which stores it in
 * ImageKit, and resolves with the hosted `MediaAsset`. Throws with a message
 * that is safe to show in the UI; the underlying error, if any, is kept as `cause`.
 */
export async function uploadProductMedia({ uri, fileName, mimeType }: LocalMedia): Promise<MediaAsset> {
  const body = new FormData();
  if (Platform.OS === 'web') {
    // Browsers need the actual bytes; the URI only points at them.
    const blob = await (await fetch(uri)).blob();
    body.append('file', new File([blob], fileName, { type: mimeType }));
  } else {
    // `fetch` on native is `expo/fetch`, which reads the bytes from an
    // expo-file-system `File`. It rejects React Native's `{ uri, name, type }`
    // objects. The name and type come from the file's path, e.g. `.jpeg` or `.mp4`.
    body.append('file', new FileSystemFile(uri));
  }

  let response: Response;
  try {
    response = await fetch('/api/upload', { method: 'POST', body });
  } catch (error) {
    throw new Error('Could not reach the server. Check your connection and try again.', {
      cause: error,
    });
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `The ${mimeType.startsWith('video/') ? 'video' : 'photo'} could not be uploaded. Please try again.`;
    throw new Error(message);
  }
  return payload as MediaAsset;
}
