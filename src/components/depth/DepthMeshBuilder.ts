import { BufferAttribute, BufferGeometry, Float32BufferAttribute } from "three";
import type { DepthMap } from "@/types/depth";

const MAX_GRID_SEGMENTS = 192;
const MIN_GRID_SEGMENTS = 32;

export function buildDepthReliefGeometry(
  depthMap: DepthMap,
  depthStrength: number,
): BufferGeometry {
  const { width, height, values } = depthMap;
  if (
    width < 2 ||
    height < 2 ||
    values.length !== width * height ||
    !Number.isFinite(depthStrength) ||
    depthStrength < 0
  ) {
    throw new Error("Cannot build a relief from invalid depth data.");
  }

  const segmentsX = Math.min(
    MAX_GRID_SEGMENTS,
    Math.max(MIN_GRID_SEGMENTS, width - 1),
  );
  const segmentsY = Math.min(
    MAX_GRID_SEGMENTS,
    Math.max(MIN_GRID_SEGMENTS, Math.round(segmentsX * (height / width))),
  );
  const positions = new Float32Array((segmentsX + 1) * (segmentsY + 1) * 3);
  const uvs = new Float32Array((segmentsX + 1) * (segmentsY + 1) * 2);
  const indices = new Uint32Array(segmentsX * segmentsY * 6);
  const modelHeight = (2 * height) / width;

  let vertexOffset = 0;
  let uvOffset = 0;
  for (let row = 0; row <= segmentsY; row += 1) {
    const v = row / segmentsY;
    const sourceY = Math.round(v * (height - 1));
    for (let column = 0; column <= segmentsX; column += 1) {
      const u = column / segmentsX;
      const sourceX = Math.round(u * (width - 1));
      positions[vertexOffset] = (u - 0.5) * 2;
      positions[vertexOffset + 1] = (0.5 - v) * modelHeight;
      positions[vertexOffset + 2] =
        values[sourceY * width + sourceX] * depthStrength;
      vertexOffset += 3;

      uvs[uvOffset] = u;
      uvs[uvOffset + 1] = 1 - v;
      uvOffset += 2;
    }
  }

  let indexOffset = 0;
  const rowStride = segmentsX + 1;
  for (let row = 0; row < segmentsY; row += 1) {
    for (let column = 0; column < segmentsX; column += 1) {
      const topLeft = row * rowStride + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + rowStride;
      const bottomRight = bottomLeft + 1;
      indices[indexOffset] = topLeft;
      indices[indexOffset + 1] = bottomLeft;
      indices[indexOffset + 2] = topRight;
      indices[indexOffset + 3] = topRight;
      indices[indexOffset + 4] = bottomLeft;
      indices[indexOffset + 5] = bottomRight;
      indexOffset += 6;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}
