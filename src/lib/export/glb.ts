import {
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildDepthReliefGeometry } from "@/components/depth/DepthMeshBuilder";
import type { DepthMap } from "@/types/depth";

export async function exportDepthReliefGlb(
  depthMap: DepthMap,
  imageUrl: string,
  depthStrength: number,
): Promise<ArrayBuffer> {
  const texture = await new TextureLoader().loadAsync(imageUrl);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  const geometry = buildDepthReliefGeometry(depthMap, depthStrength);
  const material = new MeshStandardMaterial({
    map: texture,
    roughness: 0.72,
    side: DoubleSide,
  });
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));

  try {
    const exported = await new GLTFExporter().parseAsync(scene, {
      binary: true,
    });
    if (!(exported instanceof ArrayBuffer) || exported.byteLength < 20) {
      throw new Error("GLB export returned an invalid binary file.");
    }

    return exported;
  } finally {
    geometry.dispose();
    material.dispose();
    texture.dispose();
  }
}
