"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import CheckoutButton from "@/components/billing/CheckoutButton";
import { CREDIT_BUNDLES, CREDIT_COSTS } from "@/lib/billing/plans";

const steps = [
  {
    title: "Upload",
    description:
      "Choose a JPG, PNG or WebP at least 256 × 256 px. Start with the sample if you want to see the result first.",
  },
  {
    title: "Generate",
    description:
      "Set relief strength and smoothing, then generate. Each depth relief uses 5 credits.",
  },
  {
    title: "Tilt and download",
    description:
      "Move across the 3D preview to inspect the relief from every side, then download the frame as a PNG.",
  },
];

const useCases = [
  ["Game developers", "Turn reference photos into relief assets you can check from several angles."],
  ["3D printing", "Preview how a front-facing relief reads from different angles before you print it."],
  ["Online sellers", "Clean up product photos with the background removed, ready for listings."],
  ["Designers", "Explore dimension and depth from a single reference image."],
];

function orb(context: CanvasRenderingContext2D, withBackground: boolean) {
  context.save();
  context.scale(320 / 512, 320 / 512);
  if (withBackground) {
    context.fillStyle = "#D9D2C3";
    context.fillRect(0, 0, 512, 512);
  }
  const gradient = context.createRadialGradient(200, 190, 24, 256, 256, 200);
  gradient.addColorStop(0, "#FFE3A1");
  gradient.addColorStop(0.45, "#FF9F3A");
  gradient.addColorStop(1, "#5A2410");
  context.beginPath();
  context.arc(256, 256, 188, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.restore();
}

function ReliefDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;

    const sample = document.createElement("canvas");
    sample.width = sample.height = 320;
    const sampleContext = sample.getContext("2d", { willReadFrequently: true });
    if (!sampleContext) return;
    orb(sampleContext, true);

    const source = sampleContext.getImageData(0, 0, 320, 320);
    const depth = new Float32Array(320 * 320);
    let min = Infinity;
    let max = -Infinity;
    for (let index = 0; index < depth.length; index += 1) {
      const offset = index * 4;
      const luminance =
        (0.299 * source.data[offset] +
          0.587 * source.data[offset + 1] +
          0.114 * source.data[offset + 2]) /
        255;
      depth[index] = luminance;
      min = Math.min(min, luminance);
      max = Math.max(max, luminance);
    }
    const range = max - min || 1;
    for (let index = 0; index < depth.length; index += 1) {
      depth[index] = (depth[index] - min) / range;
    }

    const result = context.createImageData(320, 320);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tilt = { x: 0, y: 0, targetX: 0, targetY: 0, lastX: NaN, lastY: NaN };
    let pointerInside = false;
    let request = 0;

    const render = () => {
      for (let y = 0; y < 320; y += 1) {
        for (let x = 0; x < 320; x += 1) {
          const index = y * 320 + x;
          const gx =
            (depth[y * 320 + Math.min(319, x + 1)] -
              depth[y * 320 + Math.max(0, x - 1)]) /
            2;
          const gy =
            (depth[Math.min(319, y + 1) * 320 + x] -
              depth[Math.max(0, y - 1) * 320 + x]) /
            2;
          const lightX = 0.7 + tilt.x * 0.6;
          const lightY = 0.7 + tilt.y * 0.6;
          const shade = 1 - (gx * lightX + gy * lightY) * 2;
          const displacement = 0.035 * 320;
          const relativeDepth = depth[index] - 0.5;
          const sx = Math.max(
            0,
            Math.min(319, Math.round(x - tilt.x * displacement * relativeDepth * 2)),
          );
          const sy = Math.max(
            0,
            Math.min(319, Math.round(y - tilt.y * displacement * relativeDepth * 2)),
          );
          const sampleOffset = (sy * 320 + sx) * 4;
          const outputOffset = index * 4;
          result.data[outputOffset] = Math.max(0, Math.min(255, source.data[sampleOffset] * shade));
          result.data[outputOffset + 1] = Math.max(0, Math.min(255, source.data[sampleOffset + 1] * shade));
          result.data[outputOffset + 2] = Math.max(0, Math.min(255, source.data[sampleOffset + 2] * shade));
          result.data[outputOffset + 3] = 255;
        }
      }
      context.putImageData(result, 0, 0);
      tilt.lastX = tilt.x;
      tilt.lastY = tilt.y;
    };

    const animate = (time: number) => {
      request = 0;
      if (!pointerInside) {
        tilt.targetX = motionQuery.matches ? 0 : Math.sin(time / 1400) * 0.55;
        tilt.targetY = motionQuery.matches ? 0 : Math.cos(time / 1900) * 0.3;
      }
      tilt.x += (tilt.targetX - tilt.x) * 0.1;
      tilt.y += (tilt.targetY - tilt.y) * 0.1;
      if (
        Math.abs(tilt.x - tilt.lastX) > 0.0008 ||
        Math.abs(tilt.y - tilt.lastY) > 0.0008
      ) {
        render();
      }
      const easing =
        Math.abs(tilt.targetX - tilt.x) > 0.0008 ||
        Math.abs(tilt.targetY - tilt.y) > 0.0008;
      if (!motionQuery.matches || pointerInside || easing) {
        request = window.requestAnimationFrame(animate);
      }
    };

    const schedule = () => {
      if (!request) request = window.requestAnimationFrame(animate);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointerInside = true;
      const bounds = canvas.getBoundingClientRect();
      tilt.targetX = Math.max(-1, Math.min(1, 2 * ((event.clientX - bounds.left) / bounds.width) - 1));
      tilt.targetY = Math.max(-1, Math.min(1, 2 * ((event.clientY - bounds.top) / bounds.height) - 1));
      schedule();
    };
    const onPointerLeave = () => {
      pointerInside = false;
      tilt.targetX = 0;
      tilt.targetY = 0;
      schedule();
    };
    const onMotionChange = () => schedule();

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    motionQuery.addEventListener("change", onMotionChange);
    render();
    if (!motionQuery.matches) schedule();

    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      motionQuery.removeEventListener("change", onMotionChange);
      if (request) window.cancelAnimationFrame(request);
    };
  }, []);

  return (
    <figure className="zolid-hero-figure">
      <canvas
        ref={canvasRef}
        className="zolid-hero-canvas"
        width={320}
        height={320}
        role="img"
        aria-label="Live depth relief preview of a shaded amber orb. Move your cursor to tilt it."
      />
      <figcaption className="zolid-figure-caption">
        <span>Sample image</span>
        <span>Move your cursor to tilt</span>
      </figcaption>
    </figure>
  );
}

function ToolComparison() {
  const rangeRef = useRef<HTMLInputElement>(null);
  const originalRef = useRef<HTMLCanvasElement>(null);
  const cutoutRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const original = originalRef.current;
    const cutout = cutoutRef.current;
    const range = rangeRef.current;
    const originalContext = original?.getContext("2d");
    const cutoutContext = cutout?.getContext("2d");
    if (!original || !cutout || !range || !originalContext || !cutoutContext) return;
    orb(originalContext, true);
    orb(cutoutContext, false);

    const update = () => {
      const position = Number(range.value);
      original.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
      cutout.style.clipPath = `inset(0 0 0 ${position}%)`;
      const divider = original.parentElement?.querySelector<HTMLElement>(".zolid-compare-divider");
      if (divider) divider.style.left = `${position}%`;
    };
    range.addEventListener("input", update);
    update();
    return () => range.removeEventListener("input", update);
  }, []);

  return (
    <figure className="zolid-compare">
      <div className="zolid-compare-frame">
        <canvas ref={originalRef} width={320} height={320} role="img" aria-label="Original amber orb on a light background" />
        <canvas ref={cutoutRef} width={320} height={320} role="img" aria-label="Amber orb cut out against a transparent background" />
        <span className="zolid-compare-divider" aria-hidden="true" />
      </div>
      <label className="zolid-visually-hidden" htmlFor="compare-range">Compare original and cutout</label>
      <input ref={rangeRef} className="zolid-compare-range" id="compare-range" type="range" min="0" max="100" defaultValue="50" aria-label="Compare original and cutout" />
      <figcaption className="zolid-compare-caption"><span>Original</span><span>Cutout</span></figcaption>
    </figure>
  );
}

export default function ZolidLanding() {
  return (
    <div className="zolid-landing">
      <header className="zolid-header">
        <div className="zolid-wrap zolid-header-row">
          <Link className="zolid-brand" href="#top" aria-label="Zolid home">
            <span className="zolid-brand-mark" aria-hidden="true">Z</span><span>Zolid</span>
          </Link>
          <nav className="zolid-nav" aria-label="Main navigation">
            <a href="#how">How it works</a><a href="#tools">Tools</a><a href="#use">Use cases</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
          </nav>
          <Link className="zolid-button zolid-button-ghost zolid-login" href="/auth/login">Log in</Link>
          <Link className="zolid-button zolid-header-cta" href="/studio">Start free</Link>
        </div>
      </header>

      <main id="top">
        <section className="zolid-hero" aria-labelledby="hero-heading">
          <div className="zolid-wrap zolid-hero-grid">
            <div className="zolid-hero-copy">
              <span className="zolid-offer">15 starter credits for every new account.</span>
              <h1 id="hero-heading">Turn any photo into a relief you can tilt.</h1>
              <p className="zolid-hero-lede">Upload a front-facing photo and get a depth relief you can inspect, tilt and download. Remove the background in the same workflow.</p>
              <a className="zolid-button zolid-button-ghost" href="#how">See how it works</a>
              <p className="zolid-hero-note">Start with 15 credits. Buy more only when you need them.</p>
            </div>
            <ReliefDemo />
          </div>
        </section>

        <section className="zolid-section" id="how" aria-labelledby="how-heading">
          <div className="zolid-wrap">
            <h2 id="how-heading">From photo to model in three steps.</h2>
            <ol className="zolid-steps">
              {steps.map((step, index) => (
                <li className="zolid-step" key={step.title}>
                  <span className="zolid-step-number">{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="zolid-section" id="tools" aria-labelledby="tools-heading">
          <div className="zolid-wrap zolid-tools-grid">
            <div className="zolid-tools-copy">
              <h2 id="tools-heading">Two tools, one upload.</h2>
              <p className="zolid-tools-lede">Upload once, then switch between depth relief and background removal without starting over.</p>
              <ul className="zolid-tool-list">
                <li><strong>Depth relief</strong><p>Brighter areas sit closer to the viewer, so tilting reveals depth. Adjust strength and smoothing as you go.</p></li>
                <li><strong>Background removal</strong><p>Removes the backdrop only where it connects to the edges, so similar colors inside the subject stay. Tune tolerance and edge softness, then export a transparent or solid-color PNG.</p></li>
              </ul>
            </div>
            <ToolComparison />
          </div>
        </section>

        <section className="zolid-section" id="use" aria-labelledby="use-heading">
          <div className="zolid-wrap">
            <h2 id="use-heading">Made for people who make things.</h2>
            <div className="zolid-use-rows">
              {useCases.map(([title, description]) => (
                <div className="zolid-use-row" key={title}><h3>{title}</h3><p>{description}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="zolid-section" id="pricing" aria-labelledby="pricing-heading">
          <div className="zolid-wrap">
            <h2 id="pricing-heading">Pricing</h2>
            <p className="zolid-pricing-intro">Start with 15 credits. Depth relief and each PNG export use 5 credits. Paid credit bundles are one-time purchases and credits do not expire.</p>
            <div className="zolid-plans">
              <section className="zolid-plan" aria-label="Free plan">
                <h3>Free</h3><p className="zolid-price">₹0</p>
                <ul><li>15 starter credits</li><li>{CREDIT_COSTS.depthRelief} credits per depth relief</li><li>{CREDIT_COSTS.backgroundPng} credits per PNG export</li></ul>
                <Link className="zolid-button" href="/studio">Start free</Link>
              </section>
              <section className="zolid-plan" aria-label="Monthly credit bundle">
                <h3>{CREDIT_BUNDLES.monthly.name}</h3><p className="zolid-price">{CREDIT_BUNDLES.monthly.displayPrice}</p>
                <ul><li>{CREDIT_BUNDLES.monthly.credits} credits</li><li>One-time payment</li><li>Credits do not expire</li></ul>
                <CheckoutButton bundleId="monthly" className="zolid-button" />
              </section>
              <section className="zolid-plan" aria-label="Weekly credit bundle">
                <h3>{CREDIT_BUNDLES.weekly.name}</h3><p className="zolid-price">{CREDIT_BUNDLES.weekly.displayPrice}</p>
                <ul><li>{CREDIT_BUNDLES.weekly.credits} credits</li><li>One-time payment</li><li>Credits do not expire</li></ul>
                <CheckoutButton bundleId="weekly" className="zolid-button" />
              </section>
              <section className="zolid-plan" aria-label="Six-month credit bundle">
                <h3>{CREDIT_BUNDLES.sixMonths.name}</h3><p className="zolid-price">{CREDIT_BUNDLES.sixMonths.displayPrice}</p>
                <ul><li>{CREDIT_BUNDLES.sixMonths.credits} credits</li><li>One-time payment</li><li>Credits do not expire</li></ul>
                <CheckoutButton bundleId="sixMonths" className="zolid-button" />
              </section>
            </div>
          </div>
        </section>

        <section className="zolid-section" id="faq" aria-labelledby="faq-heading">
          <div className="zolid-wrap">
            <h2 id="faq-heading">Frequently asked questions.</h2>
            <div className="zolid-faq-list">
              <details><summary>Is my photo private?</summary><p>In this version, both tools process your photo in your browser. Nothing is uploaded to a server.</p></details>
              <details><summary>Can I use the models commercially?</summary><p>Commercial licensing terms will be published before paid plans open.</p></details>
              <details><summary>Which photos work best?</summary><p>A single subject with clear edges, even lighting and a simple background. Use images at least 256 × 256 px. Front-facing shots give the best relief.</p></details>
              <details><summary>What does the depth relief show?</summary><p>Brighter areas are placed closer to the viewer and darker areas further back. Tilt the preview to see the depth, then download a frame.</p></details>
            </div>
          </div>
        </section>

        <section className="zolid-closing" aria-labelledby="closing-heading">
          <div className="zolid-wrap"><h2 id="closing-heading">Start with one photo.</h2></div>
        </section>
      </main>

      <footer className="zolid-footer">
        <div className="zolid-wrap zolid-footer-row">
          <Link className="zolid-footer-brand" href="#top" aria-label="Zolid home"><span className="zolid-footer-mark" aria-hidden="true">Z</span><span>Zolid</span></Link>
          <span>© 2026 Zolid.</span>
        </div>
      </footer>
    </div>
  );
}
