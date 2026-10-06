import { afterEach, describe, expect, it } from "vitest";
import { buildDepthReliefGeometry } from "../src/components/depth/DepthMeshBuilder";
import type { DepthMap } from "../src/types/depth";

const disposables: ReturnType<typeof buildDepthReliefGeometry>[] = [];

function createGeometry(depthMap: DepthMap, strength: number) {
  const geometry = buildDepthReliefGeometry(depthMap, strength);
  disposables.push(geometry);
  return geometry;
}

afterEach(() => {
  disposables.splice(0).forEach((geometry) => geometry.dispose());
});

describe("buildDepthReliefGeometry", () => {
  it("builds a subdivided mesh with UVs and normals", () => {
    const geometry = createGeometry(
      { width: 3, height: 2, values: new Float32Array([0, 0.5, 1, 0, 0.5, 1]) },
      0.8,
    );

    expect(geometry.getAttribute("position").count).toBeGreaterThan(4);
    expect(geometry.getAttribute("uv").count).toBe(
      geometry.getAttribute("position").count,
    );
    expect(geometry.getAttribute("normal").count).toBe(
      geometry.getAttribute("position").count,
    );
    expect(geometry.index?.count).toBeGreaterThan(6);
  });

  it("changes vertex displacement when depth strength changes", () => {
    const depthMap = {
      width: 2,
      height: 2,
      values: new Float32Array([0, 0.25, 0.75, 1]),
    };
    const shallow = createGeometry(depthMap, 0.2);
    const deep = createGeometry(depthMap, 0.8);
    const shallowPositions = shallow.getAttribute("position").array;
    const deepPositions = deep.getAttribute("position").array;
    const deepestVertex = Math.max(
      ...Array.from(
        { length: deepPositions.length / 3 },
        (_, index) => deepPositions[index * 3 + 2],
      ),
    );

    expect(shallowPositions).not.toEqual(deepPositions);
    expect(deepestVertex).toBeCloseTo(0.8);
  });

  it("uses image-specific depth values", () => {
    const leftPeak = createGeometry(
      { width: 2, height: 2, values: new Float32Array([1, 0, 1, 0]) },
      0.8,
    );
    const rightPeak = createGeometry(
      { width: 2, height: 2, values: new Float32Array([0, 1, 0, 1]) },
      0.8,
    );

    expect(leftPeak.getAttribute("position").array).not.toEqual(
      rightPeak.getAttribute("position").array,
    );
  });

  it("rejects malformed depth data", () => {
    expect(() =>
      buildDepthReliefGeometry(
        { width: 2, height: 2, values: new Float32Array([0, 1, 0]) },
        0.8,
      ),
    ).toThrow("Cannot build a relief from invalid depth data.");
  });
});
