"use client";

import Image from "next/image";
import { useRef } from "react";

export default function LoginVisual() {
  const sceneRef = useRef<HTMLDivElement | null>(null);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    sceneRef.current?.style.setProperty("--scene-y", `${-16 + x * 20}deg`);
    sceneRef.current?.style.setProperty("--scene-x", `${5 - y * 14}deg`);
  }

  function resetPointer() {
    sceneRef.current?.style.removeProperty("--scene-y");
    sceneRef.current?.style.removeProperty("--scene-x");
  }

  return (
    <div
      className="login-device-scene"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      aria-label="Preview of the Zolid depth relief studio"
    >
      <div className="login-device-orbit" aria-hidden="true" />
      <div className="login-device" ref={sceneRef}>
        <div className="login-device-screen">
          <div className="login-device-island" aria-hidden="true" />
          <div className="login-device-status"><span>9:41</span><span>●●● ▮</span></div>
          <div className="login-device-brand">
            <span aria-hidden="true">Z</span>
            <strong>Zolid Studio</strong>
            <i aria-hidden="true"><b /><b /><b /></i>
          </div>
          <div className="login-device-credit">Depth relief · 5 credits</div>
          <div className="login-device-feature">
            <div>
              <h3>Give your images <em>dimension.</em></h3>
              <p>Make a relief. Tilt it. Take it with you.</p>
            </div>
            <div className="login-device-image">
              <Image
                src="/examples/chair.jpg"
                alt="Example chair prepared for a depth relief"
                fill
                sizes="150px"
                className="object-cover"
              />
            </div>
          </div>
          <div className="login-device-tabs" aria-label="Studio tools">
            <span className="selected">Depth relief</span>
            <span>Remove background</span>
          </div>
          <p className="login-device-label">Source image</p>
          <div className="login-device-upload">
            <span aria-hidden="true">↑</span>
            <div>Choose an image<small>JPG, PNG, or WebP</small></div>
          </div>
          <div className="login-device-control"><span>Relief strength</span><b>72%</b></div>
          <div className="login-device-slider"><i /></div>
          <div className="login-device-control"><span>Smoothing</span><b>40%</b></div>
          <div className="login-device-slider short"><i /></div>
          <div className="login-device-generate"><span aria-hidden="true">▶</span> Generate relief</div>
          <div className="login-device-footer"><span>Studio</span><span>Gallery</span><span>Account</span></div>
        </div>
      </div>
      <div className="login-device-float float-mesh" aria-hidden="true">◇</div>
      <div className="login-device-float float-image" aria-hidden="true">▧</div>
      <div className="login-device-float float-depth" aria-hidden="true">◈</div>
    </div>
  );
}