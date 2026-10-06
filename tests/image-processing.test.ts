import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDepth, removeBg } from "../src/lib/image/processing";

class TestImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace = "srgb" as PredefinedColorSpace;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

function makeImageData(width: number, height: number, pixels: number[][]) {
  const image = new TestImageData(width, height);
  pixels.forEach((pixel, index) => image.data.set(pixel, index * 4));
  return image as unknown as ImageData;
}

beforeEach(() => {
  vi.stubGlobal("ImageData", TestImageData);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildDepth", () => {
  it("normalizes image luminance and can invert dark areas", () => {
    const image = makeImageData(2, 2, [
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [64, 64, 64, 255],
      [192, 192, 192, 255],
    ]);

    const normal = buildDepth(image, 0, false);
    const inverted = buildDepth(image, 0, true);

    expect(normal.values[0]).toBe(0);
    expect(normal.values[1]).toBe(1);
    expect(normal.values[2]).toBeCloseTo(64 / 255, 6);
    expect(normal.values[3]).toBeCloseTo(192 / 255, 6);
    expect(inverted.values[0]).toBe(1);
    expect(inverted.values[1]).toBe(0);
    expect(inverted.values[2]).toBeCloseTo(1 - 64 / 255, 6);
    expect(inverted.values[3]).toBeCloseTo(1 - 192 / 255, 6);
  });
});

describe("removeBg", () => {
  it("removes border-connected background and preserves enclosed background-colored details", () => {
    const white = [255, 255, 255, 255];
    const red = [220, 20, 20, 255];
    const image = makeImageData(5, 5, Array.from({ length: 25 }, () => white));
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) image.data.set(red, (y * 5 + x) * 4);
    }
    image.data.set(white, (2 * 5 + 2) * 4);

    const result = removeBg(image, {
      tolerance: 8,
      edgeSoftness: 0,
      solidColor: null,
    });

    expect(result.data[3]).toBe(0);
    expect(result.data[(2 * 5 + 1) * 4 + 3]).toBe(255);
    expect(result.data[(2 * 5 + 2) * 4 + 3]).toBe(255);
    expect(result.data[(2 * 5 + 3) * 4 + 3]).toBe(255);
  });

  it("composites the subject over the selected solid color", () => {
    const image = makeImageData(2, 2, [
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [255, 0, 0, 255],
    ]);

    const result = removeBg(image, {
      tolerance: 0,
      edgeSoftness: 0,
      solidColor: "#00ff00",
    });

    expect(Array.from(result.data.slice(0, 4))).toEqual([0, 255, 0, 255]);
    expect(Array.from(result.data.slice(12, 16))).toEqual([255, 0, 0, 255]);
  });
});
