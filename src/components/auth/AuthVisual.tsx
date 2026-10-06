"use client";

import { useEffect, useRef } from "react";

export default function AuthVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;

    const sample = document.createElement("canvas");
    sample.width = sample.height = 240;
    const sampleContext = sample.getContext("2d", { willReadFrequently: true });
    if (!sampleContext) return;
    sampleContext.fillStyle = "#D9D2C3";
    sampleContext.fillRect(0, 0, 240, 240);
    const orb = sampleContext.createRadialGradient(83, 75, 11, 120, 120, 94);
    orb.addColorStop(0, "#FFE3A1");
    orb.addColorStop(0.45, "#FF9F3A");
    orb.addColorStop(1, "#5A2410");
    sampleContext.beginPath();
    sampleContext.arc(120, 120, 90, 0, Math.PI * 2);
    sampleContext.fillStyle = orb;
    sampleContext.fill();
    const source = sampleContext.getImageData(0, 0, 240, 240);
    const result = context.createImageData(240, 240);
    const depth = new Float32Array(240 * 240);
    for (let index = 0; index < depth.length; index += 1) {
      const offset = index * 4;
      depth[index] =
        (0.299 * source.data[offset] +
          0.587 * source.data[offset + 1] +
          0.114 * source.data[offset + 2]) /
        255;
    }

    const draw = (tiltX: number, tiltY: number) => {
      for (let y = 0; y < 240; y += 1) {
        for (let x = 0; x < 240; x += 1) {
          const index = y * 240 + x;
          const left = depth[y * 240 + Math.max(0, x - 1)];
          const right = depth[y * 240 + Math.min(239, x + 1)];
          const up = depth[Math.max(0, y - 1) * 240 + x];
          const down = depth[Math.min(239, y + 1) * 240 + x];
          const shade = 1 - ((right - left) * (0.7 + tiltX * 0.6) + (down - up) * (0.7 + tiltY * 0.6));
          const displacement = 0.035 * 240;
          const relativeDepth = depth[index] - 0.5;
          const sx = Math.max(0, Math.min(239, Math.round(x - tiltX * displacement * relativeDepth * 2)));
          const sy = Math.max(0, Math.min(239, Math.round(y - tiltY * displacement * relativeDepth * 2)));
          const sourceOffset = (sy * 240 + sx) * 4;
          const targetOffset = index * 4;
          result.data[targetOffset] = Math.max(0, Math.min(255, source.data[sourceOffset] * shade));
          result.data[targetOffset + 1] = Math.max(0, Math.min(255, source.data[sourceOffset + 1] * shade));
          result.data[targetOffset + 2] = Math.max(0, Math.min(255, source.data[sourceOffset + 2] * shade));
          result.data[targetOffset + 3] = 255;
        }
      }
      context.putImageData(result, 0, 0);
    };

    draw(0, 0);
    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      draw(
        Math.max(-1, Math.min(1, 2 * ((event.clientX - bounds.left) / bounds.width) - 1)),
        Math.max(-1, Math.min(1, 2 * ((event.clientY - bounds.top) / bounds.height) - 1)),
      );
    };
    const onPointerLeave = () => draw(0, 0);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <figure className="auth-visual-demo">
      <canvas
        ref={canvasRef}
        width={240}
        height={240}
        role="img"
        aria-label="Amber orb depth relief preview. Move your cursor to tilt the relief."
      />
      <figcaption>Move your cursor to tilt the relief</figcaption>
    </figure>
  );
}
