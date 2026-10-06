"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { DoubleSide, SRGBColorSpace, TextureLoader } from "three";
import { buildDepthReliefGeometry } from "@/components/depth/DepthMeshBuilder";
import type { DepthMap } from "@/types/depth";

type ModelViewerProps = {
  depthMap: DepthMap;
  imageUrl: string;
  depthStrength: number;
  onReady: (previewDataUrl: string) => void;
  onWebGLUnavailable: () => void;
};

type ReliefMeshProps = Pick<
  ModelViewerProps,
  "depthMap" | "imageUrl" | "depthStrength" | "onReady"
> & {
  wireframe: boolean;
};

function ReliefMesh({
  depthMap,
  imageUrl,
  depthStrength,
  wireframe,
  onReady,
}: ReliefMeshProps) {
  const texture = useLoader(TextureLoader, imageUrl);
  const geometry = useMemo(
    () => buildDepthReliefGeometry(depthMap, depthStrength),
    [depthMap, depthStrength],
  );
  const readyCallback = useRef(onReady);
  const { gl } = useThree();

  useEffect(() => {
    readyCallback.current = onReady;
  }, [onReady]);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    requestAnimationFrame(() => {
      try {
        readyCallback.current(gl.domElement.toDataURL("image/jpeg", 0.72));
      } catch {
        readyCallback.current("");
      }
    });
  }, [geometry, texture, gl]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        map={texture}
        roughness={0.72}
        side={DoubleSide}
        wireframe={wireframe}
      />
    </mesh>
  );
}

function supportsWebGL2() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2");
  if (!context) return false;
  context.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

export default function ModelViewer({
  depthMap,
  imageUrl,
  depthStrength,
  onReady,
  onWebGLUnavailable,
}: ModelViewerProps) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [lighting, setLighting] = useState(true);
  const [viewKey, setViewKey] = useState(0);
  const readyCallback = useRef(onReady);
  const unavailableCallback = useRef(onWebGLUnavailable);

  useEffect(() => {
    readyCallback.current = onReady;
    unavailableCallback.current = onWebGLUnavailable;
  }, [onReady, onWebGLUnavailable]);

  useEffect(() => {
    const available = supportsWebGL2();
    setWebglAvailable(available);
    if (!available) unavailableCallback.current();
  }, []);

  return (
    <div className="flex h-full min-h-[300px] flex-col gap-3">
      {webglAvailable === null ? (
        <div className="grid min-h-[280px] flex-1 place-items-center rounded-lg border border-slate-800 bg-[#080d18] text-sm text-slate-400">
          Checking WebGL2 support...
        </div>
      ) : webglAvailable ? (
        <div className="min-h-[280px] flex-1 overflow-hidden rounded-lg border border-slate-800 bg-[#080d18]">
          <Canvas
            key={viewKey}
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 4.2], fov: 38 }}
            gl={{ antialias: true, alpha: false }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = SRGBColorSpace;
            }}
          >
            <color attach="background" args={["#080d18"]} />
            <PerspectiveCamera makeDefault position={[0, 0, 4.2]} fov={38} />
            <ambientLight intensity={lighting ? 0.8 : 0.32} />
            <hemisphereLight
              args={["#d8f5ff", "#17203c", lighting ? 1.2 : 0.28]}
            />
            {lighting && (
              <>
                <directionalLight position={[-3, 4, 5]} intensity={2.2} />
                <directionalLight
                  position={[3, -2, 2]}
                  intensity={0.65}
                  color="#70cfff"
                />
              </>
            )}
            <ReliefMesh
              depthMap={depthMap}
              imageUrl={imageUrl}
              depthStrength={depthStrength}
              wireframe={wireframe}
              onReady={onReady}
            />
            <OrbitControls
              makeDefault
              enableDamping
              enablePan
              enableRotate
              enableZoom
              minDistance={1.8}
              maxDistance={9}
            />
          </Canvas>
        </div>
      ) : (
        <div
          role="alert"
          className="grid min-h-[280px] flex-1 place-items-center rounded-lg border border-amber-300/20 bg-amber-300/[0.04] p-6 text-center text-sm text-amber-100"
        >
          WebGL2 is required to preview 3D models.
        </div>
      )}

      {webglAvailable && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewKey((key) => key + 1)}
            className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            Reset View
          </button>
          <button
            type="button"
            aria-pressed={wireframe}
            onClick={() => setWireframe((value) => !value)}
            className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {wireframe ? "Solid View" : "Wireframe"}
          </button>
          <button
            type="button"
            aria-pressed={lighting}
            onClick={() => setLighting((value) => !value)}
            className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {lighting ? "Lighting On" : "Lighting Off"}
          </button>
          <span className="ml-auto text-xs text-slate-500">
            Rotate · zoom · pan
          </span>
        </div>
      )}
    </div>
  );
}
