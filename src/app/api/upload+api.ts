import ImageKit, { APIError } from '@imagekit/nodejs';

import {
  isAcceptedPhotoMimeType,
  isAcceptedVideoMimeType,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  type MediaAsset,
} from '@/data/media';

const PRODUCTS_FOLDER = '/products';

// Runs on the server only. The private key never reaches the app bundle.
const imagekit = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY });
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

const DEFAULT_FILE_NAMES: Record<string, string> = {
  'image/jpeg': 'product.jpg',
  'image/png': 'product.png',
  'video/mp4': 'product.mp4',
};

/**
 * Uploads one product photo or video to ImageKit.
 *
 * Expects `multipart/form-data` with a JPG, PNG, or MP4 under the `file` field
 * and responds with a `MediaAsset` pointing at the hosted copy.
 */
export async function POST(request: Request) {
  if (!process.env.IMAGEKIT_PRIVATE_KEY || !urlEndpoint) {
    console.error('[upload] IMAGEKIT_PRIVATE_KEY or IMAGEKIT_URL_ENDPOINT is not set.');
    return errorResponse('Uploads are not configured on the server.', 500);
  }

  let file: unknown;
  try {
    // React Native's global FormData type has no `get`, but the server runtime
    // provides the standard web FormData.
    const form = (await request.formData()) as unknown as { get(name: string): unknown };
    file = form.get('file');
  } catch {
    return errorResponse('Send the file as multipart/form-data.', 400);
  }

  if (!(file instanceof File) || file.size === 0) {
    return errorResponse('Attach a photo or video under the "file" field.', 400);
  }
  const isVideo = isAcceptedVideoMimeType(file.type);
  if (!isVideo && !isAcceptedPhotoMimeType(file.type)) {
    return errorResponse('Only JPG and PNG photos and MP4 videos are supported.', 415);
  }
  if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES)) {
    return errorResponse(
      isVideo ? 'Videos must be 50 MB or smaller.' : 'Photos must be 10 MB or smaller.',
      413,
    );
  }

  try {
    const uploaded = await imagekit.files.upload({
      file,
      fileName: file.name || DEFAULT_FILE_NAMES[file.type],
      folder: PRODUCTS_FOLDER,
      useUniqueFileName: true,
    });

    if (!uploaded.fileId || !uploaded.filePath) {
      return errorResponse('ImageKit did not return the uploaded file.', 502);
    }

    const asset: MediaAsset = {
      fileId: uploaded.fileId,
      filePath: uploaded.filePath,
      url: imagekit.helper.buildSrc({ urlEndpoint, src: uploaded.filePath }),
      mediaType: isVideo ? 'video' : 'image',
      ...(uploaded.width && { width: uploaded.width }),
      ...(uploaded.height && { height: uploaded.height }),
    };
    return Response.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof APIError) {
      console.error(`[upload] ImageKit rejected the upload (${error.status}).`, error.error);
    } else {
      console.error('[upload] Uploading to ImageKit failed.', error);
    }
    return errorResponse(
      `The ${isVideo ? 'video' : 'photo'} could not be uploaded. Please try again.`,
      502,
    );
  }
}
