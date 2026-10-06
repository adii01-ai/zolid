import { afterEach, describe, expect, it, vi } from "vitest";
import { validateImageFile } from "../src/lib/validation/image";

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const jpegSignature = [0xff, 0xd8, 0xff, 0xe0];
const webpSignature = [
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
];

function imageFile(signature: number[], name = "upload.bin", type = "") {
  return new File([new Uint8Array(signature)], name, { type });
}

function stubImageDimensions(width: number, height: number) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width, height, close: vi.fn() })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateImageFile", () => {
  it("accepts supported image signatures and ignores misleading names and MIME types", async () => {
    stubImageDimensions(512, 384);

    await expect(
      validateImageFile(imageFile(pngSignature, "photo.txt", "text/plain")),
    ).resolves.toEqual({ valid: true });
    await expect(
      validateImageFile(imageFile(jpegSignature, "photo.png", "image/png")),
    ).resolves.toEqual({ valid: true });
    await expect(
      validateImageFile(imageFile(webpSignature, "photo.jpg", "image/jpeg")),
    ).resolves.toEqual({ valid: true });
  });

  it("rejects files whose real signature is not a supported image", async () => {
    const result = await validateImageFile(
      imageFile([0x25, 0x50, 0x44, 0x46], "image.jpg", "image/jpeg"),
    );

    expect(result).toEqual({
      valid: false,
      error:
        "This file is not a supported image. Choose a JPG, PNG, or WebP file.",
    });
  });

  it("rejects images smaller than 256 pixels on the shortest side", async () => {
    stubImageDimensions(1024, 255);

    const result = await validateImageFile(imageFile(pngSignature));

    expect(result).toEqual({
      valid: false,
      error: "Image must be at least 256 pixels wide and 256 pixels tall.",
    });
  });

  it("accepts an image exactly at the minimum dimensions", async () => {
    stubImageDimensions(256, 400);

    await expect(validateImageFile(imageFile(pngSignature))).resolves.toEqual({
      valid: true,
    });
  });

  it("rejects files larger than 10 MB", async () => {
    const file = imageFile(pngSignature);
    Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 + 1 });

    const result = await validateImageFile(file);

    expect(result).toEqual({
      valid: false,
      error: "Choose an image that is 10 MB or smaller.",
    });
  });

  it("accepts a file exactly 10 MB in size", async () => {
    stubImageDimensions(256, 256);
    const file = imageFile(pngSignature);
    Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 });

    await expect(validateImageFile(file)).resolves.toEqual({ valid: true });
  });

  it("rejects supported signatures that the browser cannot decode", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("decode failed")),
    );

    const result = await validateImageFile(imageFile(pngSignature));

    expect(result).toEqual({
      valid: false,
      error: "We couldn't read this image. Try choosing a different file.",
    });
  });
});
