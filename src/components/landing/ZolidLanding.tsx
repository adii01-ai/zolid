"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CheckoutButton from "@/components/billing/CheckoutButton";
import { CREDIT_BUNDLES, CREDIT_COSTS } from "@/lib/billing/plans";
import { landingCopy, type LandingLocale } from "@/components/landing/translations";

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

function ReliefDemo({ copy }: { copy: (typeof landingCopy)[LandingLocale]["demo"] }) {
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
        aria-label={copy.aria}
      />
      <figcaption className="zolid-figure-caption">
        <span>{copy.sample}</span>
        <span>{copy.tilt}</span>
      </figcaption>
    </figure>
  );
}

function ToolComparison({ copy }: { copy: (typeof landingCopy)[LandingLocale]["comparison"] }) {
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
        <canvas ref={originalRef} width={320} height={320} role="img" aria-label={copy.originalImage} />
        <canvas ref={cutoutRef} width={320} height={320} role="img" aria-label={copy.cutoutImage} />
        <span className="zolid-compare-divider" aria-hidden="true" />
      </div>
      <label className="zolid-visually-hidden" htmlFor="compare-range">{copy.aria}</label>
      <input ref={rangeRef} className="zolid-compare-range" id="compare-range" type="range" min="0" max="100" defaultValue="50" aria-label={copy.aria} />
      <figcaption className="zolid-compare-caption"><span>{copy.original}</span><span>{copy.cutout}</span></figcaption>
    </figure>
  );
}

export default function ZolidLanding() {
  const [locale, setLocale] = useState<LandingLocale>("en");
  const [localeReady, setLocaleReady] = useState(false);
  const copy = landingCopy[locale];

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("zolid-locale");
    if (savedLocale && savedLocale in landingCopy) {
      setLocale(savedLocale as LandingLocale);
    }
    setLocaleReady(true);
  }, []);

  useEffect(() => {
    if (!localeReady) return;
    window.localStorage.setItem("zolid-locale", locale);
    document.documentElement.lang = locale;
  }, [locale, localeReady]);

  return (
    <div className="zolid-landing">
      <header className="zolid-header">
        <div className="zolid-wrap zolid-header-row">
          <Link className="zolid-brand" href="#top" aria-label="Zolid home">
            <span className="zolid-brand-mark" aria-hidden="true">Z</span><span>Zolid</span>
          </Link>
          <nav className="zolid-nav" aria-label="Main navigation">
            <a href="#how">{copy.nav[0]}</a><a href="#tools">{copy.nav[1]}</a><a href="#use">{copy.nav[2]}</a><a href="#pricing">{copy.nav[3]}</a><a href="#faq">{copy.nav[4]}</a>
          </nav>
          <div className="zolid-header-actions">
            <label className="zolid-language-control">
              <span className="zolid-visually-hidden">{copy.language}</span>
              <select aria-label={copy.language} value={locale} onChange={(event) => setLocale(event.target.value as LandingLocale)}>
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </label>
            <Link className="zolid-button zolid-button-ghost zolid-login" href="/auth/login">{copy.login}</Link>
            <Link className="zolid-button zolid-header-cta" href="/studio">{copy.startFree}</Link>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="zolid-hero" aria-labelledby="hero-heading">
          <div className="zolid-wrap zolid-hero-grid">
            <div className="zolid-hero-copy">
              <span className="zolid-offer">{copy.offer}</span>
              <h1 id="hero-heading">{copy.heroTitle}</h1>
              <p className="zolid-hero-lede">{copy.heroText}</p>
              <a className="zolid-button zolid-button-ghost" href="#how">{copy.howButton}</a>
              <p className="zolid-hero-note">{copy.heroNote}</p>
            </div>
            <ReliefDemo copy={copy.demo} />
          </div>
        </section>

        <section className="zolid-section" id="how" aria-labelledby="how-heading">
          <div className="zolid-wrap">
            <h2 id="how-heading">{copy.stepsTitle}</h2>
            <ol className="zolid-steps">
              {copy.steps.map(([title, description], index) => (
                <li className="zolid-step" key={title}>
                  <span className="zolid-step-number">{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="zolid-section" id="tools" aria-labelledby="tools-heading">
          <div className="zolid-wrap zolid-tools-grid">
            <div className="zolid-tools-copy">
              <h2 id="tools-heading">{copy.toolsTitle}</h2>
              <p className="zolid-tools-lede">{copy.toolsIntro}</p>
              <ul className="zolid-tool-list">
                <li><strong>{copy.depthRelief}</strong><p>{copy.depthDescription}</p></li>
                <li><strong>{copy.backgroundRemoval}</strong><p>{copy.backgroundDescription}</p></li>
              </ul>
            </div>
            <ToolComparison copy={copy.comparison} />
          </div>
        </section>

        <section className="zolid-section" id="use" aria-labelledby="use-heading">
          <div className="zolid-wrap">
            <h2 id="use-heading">{copy.useTitle}</h2>
            <div className="zolid-use-rows">
              {copy.useCases.map(([title, description]) => (
                <div className="zolid-use-row" key={title}><h3>{title}</h3><p>{description}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="zolid-section" id="pricing" aria-labelledby="pricing-heading">
          <div className="zolid-wrap">
            <h2 id="pricing-heading">{copy.pricingTitle}</h2>
            <p className="zolid-pricing-intro">{copy.pricingIntro}</p>
            <div className="zolid-plans">
              <section className="zolid-plan" aria-label={copy.plans.freeAria}>
                <h3>{copy.plans.free}</h3><p className="zolid-price">₹0</p>
                <ul><li>15 {copy.plans.starterCredits}</li><li>{CREDIT_COSTS.depthRelief} {copy.plans.perDepth}</li><li>{CREDIT_COSTS.backgroundPng} {copy.plans.perPng}</li></ul>
                <Link className="zolid-button" href="/studio">{copy.startFree}</Link>
              </section>
              <section className="zolid-plan" aria-label={copy.plans.monthlyAria}>
                <h3>{copy.plans.monthly}</h3><p className="zolid-price">{CREDIT_BUNDLES.monthly.displayPrice}</p>
                <ul><li>{CREDIT_BUNDLES.monthly.credits} credits</li><li>{copy.plans.oneTime}</li><li>{copy.plans.noExpiry}</li></ul>
                <CheckoutButton bundleId="monthly" className="zolid-button" labels={copy.checkout} />
              </section>
              <section className="zolid-plan" aria-label={copy.plans.weeklyAria}>
                <h3>{copy.plans.weekly}</h3><p className="zolid-price">{CREDIT_BUNDLES.weekly.displayPrice}</p>
                <ul><li>{CREDIT_BUNDLES.weekly.credits} credits</li><li>{copy.plans.oneTime}</li><li>{copy.plans.noExpiry}</li></ul>
                <CheckoutButton bundleId="weekly" className="zolid-button" labels={copy.checkout} />
              </section>
              <section className="zolid-plan" aria-label={copy.plans.sixMonthsAria}>
                <h3>{copy.plans.sixMonths}</h3><p className="zolid-price">{CREDIT_BUNDLES.sixMonths.displayPrice}</p>
                <ul><li>{CREDIT_BUNDLES.sixMonths.credits} credits</li><li>{copy.plans.oneTime}</li><li>{copy.plans.noExpiry}</li></ul>
                <CheckoutButton bundleId="sixMonths" className="zolid-button" labels={copy.checkout} />
              </section>
            </div>
          </div>
        </section>

        <section className="zolid-section" id="faq" aria-labelledby="faq-heading">
          <div className="zolid-wrap">
            <h2 id="faq-heading">{copy.faqTitle}</h2>
            <div className="zolid-faq-list">
              {copy.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className="zolid-closing" aria-labelledby="closing-heading">
          <div className="zolid-wrap"><h2 id="closing-heading">{copy.closing}</h2></div>
        </section>
      </main>

      <footer className="zolid-footer">
        <div className="zolid-wrap zolid-footer-row">
          <Link className="zolid-footer-brand" href="#top" aria-label={copy.footerHome}><span className="zolid-footer-mark" aria-hidden="true">Z</span><span>Zolid</span></Link>
          <span>{copy.footerRights}</span>
        </div>
      </footer>
    </div>
  );
}
