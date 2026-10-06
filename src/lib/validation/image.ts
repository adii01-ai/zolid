export type ImageValidationResult =
  { valid: true } | { valid: false; error: string };

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_IMAGE_SIDE = 256;

function hasSignature(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function isSupportedImage(bytes: Uint8Array): boolean {
  const isJpeg = hasSignature(bytes, [0xff, 0xd8, 0xff]);
  const isPng = hasSignature(
    bytes,
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );
  const isWebp =
    hasSignature(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  return isJpeg || isPng || isWebp;
}

export async function validateImageFile(
  file: File,
): Promise<ImageValidationResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Choose an image that is 10 MB or smaller." };
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!isSupportedImage(signature)) {
    return {
      valid: false,
      error:
        "This file is not a supported image. Choose a JPG, PNG, or WebP file.",
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const shortestSide = Math.min(bitmap.width, bitmap.height);
    bitmap.close();

    if (shortestSide < MIN_IMAGE_SIDE) {
      return {
        valid: false,
        error: "Image must be at least 256 pixels wide and 256 pixels tall.",
      };
    }
  } catch {
    return {
      valid: false,
      error: "We couldn't read this image. Try choosing a different file.",
    };
  }

  return { valid: true };
}
