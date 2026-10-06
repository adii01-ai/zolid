import type { DepthMap } from "@/types/depth";

export type BackgroundRemovalOptions = {
  tolerance: number;
  edgeSoftness: number;
  solidColor: string | null;
};

function boxBlur(values: Float32Array, width: number, height: number, radius: number) {
  if (radius <= 0) return values;
  const horizontal = new Float32Array(values.length);
  const output = new Float32Array(values.length);
  const windowSize = radius * 2 + 1;

  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = -radius; x <= radius; x += 1) {
      sum += values[y * width + Math.max(0, Math.min(width - 1, x))];
    }
    for (let x = 0; x < width; x += 1) {
      horizontal[y * width + x] = sum / windowSize;
      const removeX = Math.max(0, x - radius);
      const addX = Math.min(width - 1, x + radius + 1);
      sum += values[y * width + addX] - values[y * width + removeX];
    }
  }

  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) {
      sum += horizontal[Math.max(0, Math.min(height - 1, y)) * width + x];
    }
    for (let y = 0; y < height; y += 1) {
      output[y * width + x] = sum / windowSize;
      const removeY = Math.max(0, y - radius);
      const addY = Math.min(height - 1, y + radius + 1);
      sum +=
        horizontal[addY * width + x] - horizontal[removeY * width + x];
    }
  }
  return output;
}

export function buildDepth(
  image: ImageData,
  smoothing: number,
  treatDarkAsNear: boolean,
): DepthMap {
  const { width, height, data } = image;
  const values = new Float32Array(width * height);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < values.length; index += 1) {
    const pixel = index * 4;
    const luminance =
      (0.299 * data[pixel] + 0.587 * data[pixel + 1] + 0.114 * data[pixel + 2]) /
      255;
    values[index] = luminance;
    min = Math.min(min, luminance);
    max = Math.max(max, luminance);
  }

  const range = max - min || 1;
  for (let index = 0; index < values.length; index += 1) {
    let value = (values[index] - min) / range;
    if (treatDarkAsNear) value = 1 - value;
    values[index] = value;
  }

  return {
    width,
    height,
    values: boxBlur(values, width, height, Math.max(0, Math.round(smoothing))),
  };
}

function parseHexColor(color: string | null): [number, number, number] | null {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return null;
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

export function removeBg(
  image: ImageData,
  options: BackgroundRemovalOptions,
): ImageData {
  const { width, height, data } = image;
  const pixelCount = width * height;
  const borderR: number[] = [];
  const borderG: number[] = [];
  const borderB: number[] = [];
  const addBorder = (index: number) => {
    const offset = index * 4;
    borderR.push(data[offset]);
    borderG.push(data[offset + 1]);
    borderB.push(data[offset + 2]);
  };

  for (let x = 0; x < width; x += 1) {
    addBorder(x);
    if (height > 1) addBorder((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    addBorder(y * width);
    if (width > 1) addBorder(y * width + width - 1);
  }

  const median = (values: number[]) => {
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 0;
  };
  const background = [median(borderR), median(borderG), median(borderB)];
  const tolerance = Math.max(0, options.tolerance);
  const mask = new Uint8Array(pixelCount);
  const stack = new Int32Array(pixelCount);
  let stackSize = 0;

  const matchesBackground = (index: number) => {
    const offset = index * 4;
    const dr = data[offset] - background[0];
    const dg = data[offset + 1] - background[1];
    const db = data[offset + 2] - background[2];
    return Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance;
  };

  const pushIfBackground = (index: number) => {
    if (mask[index] || !matchesBackground(index)) return;
    mask[index] = 1;
    stack[stackSize++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    pushIfBackground(x);
    pushIfBackground((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    pushIfBackground(y * width);
    pushIfBackground(y * width + width - 1);
  }

  while (stackSize > 0) {
    const index = stack[--stackSize];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) pushIfBackground(index - 1);
    if (x + 1 < width) pushIfBackground(index + 1);
    if (y > 0) pushIfBackground(index - width);
    if (y + 1 < height) pushIfBackground(index + width);
  }

  const alpha = new Float32Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    alpha[index] = mask[index] ? 0 : 1;
  }
  const softAlpha = boxBlur(
    alpha,
    width,
    height,
    Math.max(0, Math.round(options.edgeSoftness)),
  );
  const solid = parseHexColor(options.solidColor);
  const output = new ImageData(width, height);

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const opacity = Math.max(0, Math.min(1, softAlpha[index]));
    for (let channel = 0; channel < 3; channel += 1) {
      output.data[offset + channel] = solid
        ? Math.round(data[offset + channel] * opacity + solid[channel] * (1 - opacity))
        : data[offset + channel];
    }
    output.data[offset + 3] = solid ? 255 : Math.round(opacity * 255);
  }
  return output;
}

export function imageDataToDepthFrame(
  image: ImageData,
  depth: DepthMap,
  reliefStrength: number,
  tiltX: number,
  tiltY: number,
): ImageData {
  const output = new ImageData(depth.width, depth.height);
  const strength = Math.max(0, reliefStrength) / 100;
  const lightX = -0.45 + tiltX * 0.35;
  const lightY = -0.65 + tiltY * 0.35;
  const lightLength = Math.hypot(lightX, lightY) || 1;

  for (let y = 0; y < depth.height; y += 1) {
    for (let x = 0; x < depth.width; x += 1) {
      const index = y * depth.width + x;
      const z = depth.values[index];
      const sampleX = Math.max(
        0,
        Math.min(depth.width - 1, Math.round(x + tiltX * z * strength * 34)),
      );
      const sampleY = Math.max(
        0,
        Math.min(depth.height - 1, Math.round(y + tiltY * z * strength * 34)),
      );
      const sample = (sampleY * depth.width + sampleX) * 4;
      const sourceX = Math.max(
        0,
        Math.min(image.width - 1, Math.round((sampleX / depth.width) * image.width)),
      );
      const sourceY = Math.max(
        0,
        Math.min(image.height - 1, Math.round((sampleY / depth.height) * image.height)),
      );
      const source = (sourceY * image.width + sourceX) * 4;
      const left = depth.values[sampleY * depth.width + Math.max(0, sampleX - 1)];
      const right = depth.values[sampleY * depth.width + Math.min(depth.width - 1, sampleX + 1)];
      const up = depth.values[Math.max(0, sampleY - 1) * depth.width + sampleX];
      const down = depth.values[Math.min(depth.height - 1, sampleY + 1) * depth.width + sampleX];
      const gradientX = (right - left) * strength;
      const gradientY = (down - up) * strength;
      const shade = Math.max(
        0.55,
        Math.min(1.25, 0.88 + (-gradientX * lightX - gradientY * lightY) / lightLength),
      );
      const target = index * 4;
      output.data[target] = Math.min(255, image.data[source] * shade);
      output.data[target + 1] = Math.min(255, image.data[source + 1] * shade);
      output.data[target + 2] = Math.min(255, image.data[source + 2] * shade);
      output.data[target + 3] = image.data[source + 3];
    }
  }
  return output;
}
