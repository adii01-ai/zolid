"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Dropzone from "@/components/upload/Dropzone";
import type { DepthMap } from "@/types/depth";
import { exportDepthReliefGlb } from "@/lib/export/glb";
import { CREDIT_COSTS } from "@/lib/billing/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import StudioAssistant from "@/components/studio/StudioAssistant";
import {
  buildDepth,
  imageDataToDepthFrame,
  removeBg,
} from "@/lib/image/processing";

const ModelViewer = dynamic(() => import("@/components/viewer/ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[280px] place-items-center rounded-lg border border-slate-800 bg-[#080d18] text-sm text-slate-400">
      Preparing 3D viewer...
    </div>
  ),
});

export type StudioGeneration = {
  id: string;
  source: "free" | "purchased";
  completedAt: string;
  previewDataUrl: string | null;
};

type StudioWorkspaceProps = {
  credits: number | null;
  allowanceConfigured: boolean;
  recentGenerations: StudioGeneration[] | null;
};

type StudioTool = "depth" | "background";

type SessionResult = {
  id: string;
  label: string;
  time: string;
  thumbnail: string;
};

async function readImageData(file: File, maxDimension: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("Image processing is unavailable in this browser.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The image could not be exported."));
    }, type, quality);
  });
}

async function createStoredPreview(previewDataUrl: string) {
  const response = await fetch(previewDataUrl);
  if (!response.ok) throw new Error("The relief preview could not be read.");
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("The relief preview could not be prepared.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const storedPreview = canvas.toDataURL("image/jpeg", 0.55);
  if (storedPreview.length > 180_000) {
    throw new Error("The relief preview could not be compressed for saving.");
  }
  return storedPreview;
}

async function createOrbSample() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the sample image.");
  context.fillStyle = "#e9e4da";
  context.fillRect(0, 0, 512, 512);
  const shadow = context.createRadialGradient(272, 374, 18, 256, 378, 170);
  shadow.addColorStop(0, "rgba(28, 25, 20, 0.24)");
  shadow.addColorStop(1, "rgba(28, 25, 20, 0)");
  context.fillStyle = shadow;
  context.fillRect(64, 220, 384, 230);
  const orb = context.createRadialGradient(194, 168, 18, 256, 256, 176);
  orb.addColorStop(0, "#fff8e9");
  orb.addColorStop(0.38, "#d8b87d");
  orb.addColorStop(0.78, "#86633e");
  orb.addColorStop(1, "#352b20");
  context.beginPath();
  context.arc(256, 250, 176, 0, Math.PI * 2);
  context.fillStyle = orb;
  context.fill();
  const blob = await canvasToBlob(canvas, "image/png");
  return new File([blob], "zolid-orb-sample.png", { type: "image/png" });
}

const exampleImages = [
  { label: "Chair", src: "/examples/chair.jpg" },
  { label: "Sneaker", src: "/examples/sneaker.jpg" },
  { label: "Headphones", src: "/examples/headphones.jpg" },
  { label: "Backpack", src: "/examples/backpack.jpg" },
  { label: "Mug", src: "/examples/mug.jpg" },
  { label: "Figurine", src: "/examples/toy.jpg" },
  { label: "Camera", src: "/examples/camera.jpg" },
  { label: "Bottle", src: "/examples/bottle.jpg" },
];

export default function StudioWorkspace({
  credits,
  allowanceConfigured: initialAllowanceConfigured,
  recentGenerations,
}: StudioWorkspaceProps) {
  const router = useRouter();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantLauncherPosition, setAssistantLauncherPosition] = useState({
    left: 16,
    bottom: 16,
  });
  const assistantDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startBottom: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const suppressAssistantClick = useRef(false);
  const [activeTool, setActiveTool] = useState<StudioTool>("depth");
  const [showThreePreview, setShowThreePreview] = useState(false);
  const [showOriginalPreview, setShowOriginalPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileRequest, setFileRequest] = useState<{
    id: number;
    file: File;
  } | null>(null);
  const [sampleId, setSampleId] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [depthMap, setDepthMap] = useState<DepthMap | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null);
  const [depthReliefStrength, setDepthReliefStrength] = useState(60);
  const [smoothing, setSmoothing] = useState(4);
  const [treatDarkAsNear, setTreatDarkAsNear] = useState(false);
  const [colorTolerance, setColorTolerance] = useState(40);
  const [edgeSoftness, setEdgeSoftness] = useState(2);
  const [backgroundMode, setBackgroundMode] = useState<"transparent" | "solid">(
    "transparent",
  );
  const [solidColor, setSolidColor] = useState("#ffffff");
  const [backgroundResult, setBackgroundResult] = useState<ImageData | null>(
    null,
  );
  const [comparePosition, setComparePosition] = useState(50);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const beforeCompareCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const reliefCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRequest = useRef(0);
  const tilt = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const tiltFrame = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [purchasedCredits, setPurchasedCredits] = useState(credits);
  const [allowanceConfigured, setAllowanceConfigured] = useState(
    initialAllowanceConfigured,
  );
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [reliefStrength, setReliefStrength] = useState(60);
  const [isExporting, setIsExporting] = useState(false);
  const completionStarted = useRef(false);
  const generationRun = useRef(0);
  const canGenerate =
    allowanceConfigured &&
    purchasedCredits !== null &&
    purchasedCredits >= CREDIT_COSTS.depthRelief;
  const canExportBackground =
    allowanceConfigured &&
    purchasedCredits !== null &&
    purchasedCredits >= CREDIT_COSTS.backgroundPng;

  function handleAssistantPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    if (event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    assistantDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: bounds.left,
      startBottom: window.innerHeight - bounds.bottom,
      width: bounds.width,
      height: bounds.height,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleAssistantPointerMove(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const drag = assistantDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 4) return;
    drag.moved = true;

    const maxLeft = Math.max(8, window.innerWidth - drag.width - 8);
    const maxBottom = Math.max(8, window.innerHeight - drag.height - 8);
    setAssistantLauncherPosition({
      left: Math.min(maxLeft, Math.max(8, drag.startLeft + deltaX)),
      bottom: Math.min(maxBottom, Math.max(8, drag.startBottom - deltaY)),
    });
  }

  function handleAssistantPointerUp(
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    const drag = assistantDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    suppressAssistantClick.current = drag.moved;
    assistantDrag.current = null;
  }

  function handleAssistantClick() {
    if (suppressAssistantClick.current) {
      suppressAssistantClick.current = false;
      return;
    }
    setAssistantOpen((open) => !open);
  }

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }

  function rememberResult(label: string, thumbnail: string) {
    setSessionResults((results) => [
      {
        id: crypto.randomUUID(),
        label,
        thumbnail,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...results,
    ].slice(0, 6));
  }

  async function handleTrySample() {
    try {
      const file = await createOrbSample();
      setFileRequest({ id: Date.now(), file });
      showToast("Sample photo loaded. Choose a tool to continue.");
    } catch {
      showToast("The sample could not be created in this browser.");
    }
  }

  async function handleRemoveBackground() {
    if (!selectedFile || isDownloading) return;
    setIsDownloading(true);
    try {
      const highResolution = await readImageData(selectedFile, 2400);
      const previewMax = Math.max(
        sourceImageData?.width ?? 512,
        sourceImageData?.height ?? 512,
      );
      const exportMax = Math.max(highResolution.width, highResolution.height);
      const output = removeBg(highResolution, {
        tolerance: colorTolerance,
        edgeSoftness: Math.round(edgeSoftness * (exportMax / previewMax)),
        solidColor: backgroundMode === "solid" ? solidColor : null,
      });
      const canvas = document.createElement("canvas");
      canvas.width = output.width;
      canvas.height = output.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not export the result.");
      context.putImageData(output, 0, 0);
      const blob = await canvasToBlob(canvas, "image/png");
      const supabase = createSupabaseBrowserClient();
      const { data: remainingCredits, error: chargeError } = await supabase.rpc(
        "charge_background_export",
      );
      if (chargeError) {
        if (chargeError.message.includes("insufficient_credits")) {
          throw new Error(`Each PNG export costs ${CREDIT_COSTS.backgroundPng} credits. Buy a credit bundle to continue.`);
        }
        throw new Error("The export could not be charged. Please try again.");
      }
      setPurchasedCredits(typeof remainingCredits === "number" ? remainingCredits : Math.max(0, (purchasedCredits ?? 0) - CREDIT_COSTS.backgroundPng));
      router.refresh();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${selectedFile.name.replace(/\.[^.]+$/, "")}-no-bg.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      const thumbnailCanvas = document.createElement("canvas");
      thumbnailCanvas.width = 240;
      thumbnailCanvas.height = 240;
      const thumbnailContext = thumbnailCanvas.getContext("2d");
      if (thumbnailContext) {
        thumbnailContext.fillStyle = "#f3ede2";
        thumbnailContext.fillRect(0, 0, 240, 240);
        thumbnailContext.drawImage(canvas, 0, 0, 240, 240);
        rememberResult("Background removed", thumbnailCanvas.toDataURL("image/jpeg", 0.7));
      }
      showToast("Background removed. PNG downloaded.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Background removal failed.");
    } finally {
      setIsDownloading(false);
    }
  }

  useEffect(() => {
    setDepthMap(null);
    setGenerationError(null);
    setGenerationStage("");
    completionStarted.current = false;
    setIsGenerating(false);
    setBackgroundResult(null);
    setSourceImageData(null);
    if (!selectedFile) {
      setImageUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setImageUrl(objectUrl);
    const requestId = ++imageRequest.current;
    void readImageData(selectedFile, 512)
      .then((imageData) => {
        if (requestId === imageRequest.current) setSourceImageData(imageData);
      })
      .catch(() => showToast("This image could not be opened. Choose another file."));
    return () => {
      URL.revokeObjectURL(objectUrl);
      imageRequest.current += 1;
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!sourceImageData || activeTool !== "background") return;
    setIsRemovingBackground(true);
    const frame = requestAnimationFrame(() => {
      try {
        const result = removeBg(sourceImageData, {
          tolerance: colorTolerance,
          edgeSoftness,
          solidColor: backgroundMode === "solid" ? solidColor : null,
        });
        setBackgroundResult(result);
      } catch {
        showToast("Background removal could not run on this image.");
      } finally {
        setIsRemovingBackground(false);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [sourceImageData, activeTool, colorTolerance, edgeSoftness, backgroundMode, solidColor]);

  useEffect(() => {
    if (activeTool !== "background" || !backgroundResult) return;
    const canvas = backgroundCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = backgroundResult.width;
    canvas.height = backgroundResult.height;
    context.putImageData(backgroundResult, 0, 0);
  }, [activeTool, backgroundResult]);

  useEffect(() => {
    if (activeTool !== "background" || !sourceImageData) return;
    const canvas = beforeCompareCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = sourceImageData.width;
    canvas.height = sourceImageData.height;
    context.putImageData(sourceImageData, 0, 0);
  }, [activeTool, sourceImageData]);

  useEffect(() => {
    if (!sourceImageData || !depthMap || activeTool !== "depth") return;
    const frame = requestAnimationFrame(() => {
      const canvas = reliefCanvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      const rendered = imageDataToDepthFrame(
        sourceImageData,
        depthMap,
        depthReliefStrength,
        tilt.current.x,
        tilt.current.y,
      );
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      context.putImageData(rendered, 0, 0);
      if (reservationId) {
        requestAnimationFrame(() => {
          try {
            void handleViewerReady(canvas.toDataURL("image/jpeg", 0.72));
          } catch {
            void cancelReservation();
            showToast("The relief preview could not be saved.");
          }
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [sourceImageData, depthMap, activeTool, reliefStrength, reservationId]);

  const disabledReason = !selectedFile
    ? "Upload a valid photo to continue."
    : isGenerating
      ? generationStage
      : !allowanceConfigured || purchasedCredits === null
        ? "Generation allowance is not configured. Apply the Supabase migration and refresh."
          : !canGenerate
            ? `A depth relief costs ${CREDIT_COSTS.depthRelief} credits. Buy a bundle to continue.`
          : depthMap
            ? "Depth relief ready. Generate again to reprocess this image."
            : "Ready to generate a depth relief.";

  function handleSelectedFile(file: File | null) {
    generationRun.current += 1;
    if (reservationId) {
      void fetch("/api/depth/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      }).catch(() => undefined);
    }
    setReservationId(null);
    setSelectedFile(file);
  }

  async function handleGenerate() {
    if (!selectedFile || isGenerating || !canGenerate) return;

    const runId = generationRun.current;
    let pendingReservationId: string | null = null;
    setIsGenerating(true);
    setGenerationError(null);
    setDepthMap(null);
    setReservationId(null);
    completionStarted.current = false;
    setGenerationStage("Generating depth relief...");

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      const response = await fetch("/api/depth/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string;
          code?: string;
        } | null;
        if (result?.code === "INSUFFICIENT_CREDITS") {
          const credits = (result as { credits?: number }).credits;
          if (typeof credits === "number") setPurchasedCredits(credits);
        } else if (result?.code === "ALLOWANCE_UNAVAILABLE") {
          setAllowanceConfigured(false);
          setPurchasedCredits(null);
        }
        throw new Error(result?.error || "Depth relief generation failed.");
      }

      const result = (await response.json()) as { reservationId: string };
      if (!result.reservationId || !sourceImageData) {
        if (result.reservationId) {
          await fetch("/api/depth/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reservationId: result.reservationId }),
          }).catch(() => undefined);
        }
        throw new Error("Depth relief generation returned invalid data.");
      }

      if (runId !== generationRun.current) {
        await fetch("/api/depth/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservationId: result.reservationId }),
        }).catch(() => undefined);
        return;
      }

      pendingReservationId = result.reservationId;
      setGenerationStage("Preparing depth relief...");
      setImageUrl(URL.createObjectURL(selectedFile));
      setReservationId(result.reservationId);
      setDepthMap(buildDepth(sourceImageData, smoothing, treatDarkAsNear));
    } catch (error) {
      if (pendingReservationId) {
        await fetch("/api/depth/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservationId: pendingReservationId }),
        }).catch(() => undefined);
      }
      if (runId !== generationRun.current) return;
      if (process.env.NODE_ENV === "development") {
        console.error("[ZOLID] Depth relief generation failed", error);
      }
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Depth relief generation failed. Please try again.",
      );
      setGenerationStage("");
      setIsGenerating(false);
    }
  }

  async function handleViewerReady(previewDataUrl: string) {
    if (!reservationId || completionStarted.current) return;
    if (!previewDataUrl.startsWith("data:image/jpeg;base64,")) {
      setGenerationError("The relief preview could not be saved. Try generating again.");
      await cancelReservation();
      setIsGenerating(false);
      return;
    }
    completionStarted.current = true;
    setGenerationStage("Saving generation...");
    try {
      const storedPreview = await createStoredPreview(previewDataUrl);
      const response = await fetch("/api/depth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, previewDataUrl: storedPreview }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        purchasedCredits?: number;
      } | null;
      if (!response.ok || !result) {
        throw new Error(
          result?.error || "The generation allowance could not be updated.",
        );
      }
      setPurchasedCredits(result.purchasedCredits ?? purchasedCredits);
      router.refresh();
      setGenerationStage("Depth relief ready");
      setReservationId(null);
      rememberResult("Depth relief", storedPreview);
      showToast("Depth relief generated and saved to Gallery.");
    } catch (error) {
      completionStarted.current = false;
      await cancelReservation();
      setGenerationError(
        error instanceof Error
          ? error.message
          : "The generation allowance could not be updated.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleWebGLUnavailable() {
    setGenerationError("WebGL2 is required to preview 3D models.");
    setGenerationStage("");
    void cancelReservation();
    setIsGenerating(false);
  }

  async function cancelReservation() {
    if (!reservationId) return;
    await fetch("/api/depth/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId }),
    }).catch(() => undefined);
    setReservationId(null);
  }

  async function handleExport() {
    if (!depthMap || !imageUrl || isExporting) return;
    setIsExporting(true);
    setGenerationError(null);
    try {
      const arrayBuffer = await exportDepthReliefGlb(
        depthMap,
        imageUrl,
        reliefStrength / 75,
      );
      const downloadUrl = URL.createObjectURL(
        new Blob([arrayBuffer], { type: "model/gltf-binary" }),
      );
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "zolid-depth-relief.glb";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      showToast("Depth relief GLB downloaded.");
    } catch {
      setGenerationError(
        "The depth relief could not be exported. Please try again.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  function updateDepthSettings(nextSmoothing: number, nextDarkAsNear: boolean) {
    setSmoothing(nextSmoothing);
    setTreatDarkAsNear(nextDarkAsNear);
    if (sourceImageData && depthMap) {
      setDepthMap(buildDepth(sourceImageData, nextSmoothing, nextDarkAsNear));
    }
  }

  function drawTiltFrame() {
    const canvas = reliefCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context && sourceImageData && depthMap) {
      const frame = imageDataToDepthFrame(
        sourceImageData,
        depthMap,
        reliefStrength,
        tilt.current.x,
        tilt.current.y,
      );
      canvas.width = frame.width;
      canvas.height = frame.height;
      context.putImageData(frame, 0, 0);
    }
  }

  function scheduleTiltFrame() {
    if (tiltFrame.current !== null) return;
    const animate = () => {
      tilt.current.x += (tilt.current.targetX - tilt.current.x) * 0.16;
      tilt.current.y += (tilt.current.targetY - tilt.current.y) * 0.16;
      drawTiltFrame();
      const moving =
        Math.abs(tilt.current.targetX - tilt.current.x) > 0.002 ||
        Math.abs(tilt.current.targetY - tilt.current.y) > 0.002;
      if (moving) tiltFrame.current = requestAnimationFrame(animate);
      else tiltFrame.current = null;
    };
    tiltFrame.current = requestAnimationFrame(animate);
  }

  function addDepthTilt(event: React.PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    tilt.current.targetX = Math.max(
      -1,
      Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2),
    );
    tilt.current.targetY = Math.max(
      -1,
      Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2),
    );
    scheduleTiltFrame();
  }

  function resetDepthTilt() {
    tilt.current.targetX = 0;
    tilt.current.targetY = 0;
    scheduleTiltFrame();
  }

  async function downloadReliefFrame() {
    const canvas = reliefCanvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, "image/png");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zolid-depth-relief.png";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Depth relief frame downloaded.");
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={assistantOpen}
        aria-controls="studio-assistant-panel"
        aria-label="AI chat launcher. Drag to move, click to open."
        title="Drag to move, click to open"
        onPointerDown={handleAssistantPointerDown}
        onPointerMove={handleAssistantPointerMove}
        onPointerUp={handleAssistantPointerUp}
        onPointerCancel={handleAssistantPointerUp}
        onClick={handleAssistantClick}
        style={assistantLauncherPosition}
        className="fixed z-40 touch-none select-none cursor-grab rounded-full border border-[#4A4030] bg-[#17191F] px-3 py-2 text-[11px] font-semibold text-[#FFB547] shadow-lg hover:bg-[#242833] active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-[#FFB547]"
      >
        AI chat
      </button>

      <section
        aria-label="3D model creation workspace"
        className="grid grid-cols-1 gap-3 lg:grid-cols-[256px_minmax(0,1fr)] lg:items-start"
      >
        <aside aria-label="Image and generation controls" className="order-1 min-w-0 rounded-lg border border-[#292D35] bg-[#111318] p-3 sm:p-4 lg:col-start-1 lg:row-start-1">
          <div
            role="tablist"
            aria-label="Image tools"
            className="mb-3 grid grid-cols-2 rounded-md border border-[#37321F] bg-[#15130F] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTool === "depth"}
              onClick={() => setActiveTool("depth")}
              className={`rounded px-2 py-2 text-[10px] font-semibold transition-colors ${activeTool === "depth" ? "bg-[#FFB547] text-[#15130F]" : "text-[#9D9484] hover:text-[#F3EDE2]"}`}
            >
              Depth relief
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTool === "background"}
              onClick={() => setActiveTool("background")}
              className={`rounded px-2 py-2 text-[10px] font-semibold transition-colors ${activeTool === "background" ? "bg-[#FFB547] text-[#15130F]" : "text-[#9D9484] hover:text-[#F3EDE2]"}`}
            >
              Remove background
            </button>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#828A96]">
                Source image
              </p>
              <h2 className="mt-1 text-sm font-semibold text-[#E4E6EA]">
                {selectedFile ? selectedFile.name : "Choose an image"}
              </h2>
              <p className="mt-1 text-[10px] text-[#8B929D]">
                {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "JPG, PNG, or WebP · up to 10 MB"}
              </p>
            </div>
            {selectedFile && (
              <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-200">
                Image ready
              </span>
            )}
          </div>
          <Dropzone
            onFileChange={handleSelectedFile}
            examples={exampleImages}
            fileRequest={fileRequest}
            compact
          />
          <button
            type="button"
            onClick={() => void handleTrySample()}
            className="mt-2 rounded-md border border-[#343944] px-3 py-2 text-[11px] text-[#D3D6DC] transition-colors hover:bg-[#1B1E25] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]"
          >
            Try a sample
          </button>
          {selectedFile && (
            <p className="mt-2 break-all text-[10px] text-[#828A96]">
              Selected: {selectedFile.name} ·{" "}
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              {sourceImageData && ` · ${sourceImageData.width} × ${sourceImageData.height} px`}
            </p>
          )}
          <fieldset className="mt-3 border-t border-[#292D35] pt-3">
            <legend className="px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9BA2AD]">
              {activeTool === "depth" ? "Depth settings" : "Removal settings"}
            </legend>
            {activeTool === "depth" ? (
              <div className="space-y-3">
                <label className="block text-[11px] text-[#D3D6DC]">
                  <span className="flex justify-between">Relief strength <output>{reliefStrength}</output></span>
                  <input type="range" min="0" max="100" value={reliefStrength} onChange={(event) => setReliefStrength(Number(event.currentTarget.value))} className="mt-1.5 w-full accent-[#FFB547]" />
                </label>
                <label className="block text-[11px] text-[#D3D6DC]">
                  <span className="flex justify-between">Smoothing <output>{smoothing}</output></span>
                  <input type="range" min="0" max="12" value={smoothing} onChange={(event) => updateDepthSettings(Number(event.currentTarget.value), treatDarkAsNear)} className="mt-1.5 w-full accent-[#FFB547]" />
                </label>
                <label className="flex items-center gap-2 text-[11px] text-[#D3D6DC]">
                  <input type="checkbox" checked={treatDarkAsNear} onChange={(event) => updateDepthSettings(smoothing, event.currentTarget.checked)} className="size-4 accent-[#FFB547]" />
                  Treat dark areas as near
                </label>
                <div className="border-t border-[#292D35] pt-3">
                  <p className="text-[11px] font-semibold text-[#D3D6DC]">Credit use</p>
                  <p className="mt-1.5 text-[10px] text-[#8B929D]">{allowanceConfigured ? `${purchasedCredits ?? 0} credits available` : "Generation balance unavailable"}</p>
                  {purchasedCredits !== null && <p className="mt-1 text-[10px] text-[#8B929D]">{CREDIT_COSTS.depthRelief} credits per depth relief</p>}
                  <p className="mt-1 text-[10px] text-[#8B929D]">{CREDIT_COSTS.backgroundPng} credits per PNG export</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-[11px] text-[#D3D6DC]">
                  <span className="flex justify-between">Color tolerance <output>{colorTolerance}</output></span>
                  <input type="range" min="0" max="150" value={colorTolerance} onChange={(event) => setColorTolerance(Number(event.currentTarget.value))} className="mt-1.5 w-full accent-[#FFB547]" />
                </label>
                <label className="block text-[11px] text-[#D3D6DC]">
                  <span className="flex justify-between">Edge softness <output>{edgeSoftness}</output></span>
                  <input type="range" min="0" max="10" value={edgeSoftness} onChange={(event) => setEdgeSoftness(Number(event.currentTarget.value))} className="mt-1.5 w-full accent-[#FFB547]" />
                </label>
                <fieldset className="flex flex-wrap items-center gap-4">
                  <legend className="mb-2 text-[11px] text-[#D3D6DC]">Background</legend>
                  <label className="flex items-center gap-2 text-[11px] text-[#D3D6DC]"><input type="radio" name="background-choice" checked={backgroundMode === "transparent"} onChange={() => setBackgroundMode("transparent")} className="accent-[#FFB547]" />Transparent</label>
                  <label className="flex items-center gap-2 text-[11px] text-[#D3D6DC]"><input type="radio" name="background-choice" checked={backgroundMode === "solid"} onChange={() => setBackgroundMode("solid")} className="accent-[#FFB547]" />Solid color</label>
                  {backgroundMode === "solid" && <input aria-label="Solid background color" type="color" value={solidColor} onChange={(event) => setSolidColor(event.currentTarget.value)} />}
                </fieldset>
              </div>
            )}
          </fieldset>
          <div className="mt-3 border-t border-[#292D35] pt-3">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9BA2AD]">Output</p>
              <button type="button" onClick={() => activeTool === "depth" ? void handleGenerate() : void handleRemoveBackground()} disabled={!selectedFile || (activeTool === "depth" ? isGenerating || !canGenerate : isDownloading || !canExportBackground)} aria-describedby="generation-state" className="w-full rounded-md bg-[#FFB547] px-4 py-3 text-xs font-semibold text-[#15130F] transition-colors hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFB547] disabled:cursor-not-allowed disabled:opacity-50">
                {activeTool === "depth" ? "Generate depth relief" : isDownloading ? "Preparing PNG..." : "Download PNG"}
              </button>
              <p id="generation-state" role="status" className="text-[10px] leading-4 text-[#8B929D]">
                {activeTool === "depth" ? disabledReason : !selectedFile ? "Upload a photo to continue." : isRemovingBackground ? "Updating background preview..." : !allowanceConfigured || purchasedCredits === null ? "Credit balance unavailable. Refresh or contact support." : purchasedCredits < CREDIT_COSTS.backgroundPng ? `Each PNG export costs ${CREDIT_COSTS.backgroundPng} credits. Buy a bundle to continue.` : `Preview ready. Downloading a PNG uses ${CREDIT_COSTS.backgroundPng} credits.`}
              </p>
              {allowanceConfigured && purchasedCredits !== null && ((activeTool === "depth" && purchasedCredits < CREDIT_COSTS.depthRelief) || (activeTool === "background" && purchasedCredits < CREDIT_COSTS.backgroundPng)) && (
                <Link href="/billing" className="inline-flex justify-center rounded-md border border-[#3B414B] px-3 py-2 text-[10px] font-semibold text-[#E4E6EA] hover:bg-[#1B1E25] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]">Buy credits</Link>
              )}
              {generationError && <p role="alert" className="text-[10px] text-rose-300">{generationError}</p>}
            </div>
          </div>
        </aside>

        <section
          aria-labelledby="preview-heading"
          className="order-2 min-h-[480px] min-w-0 rounded-lg border border-[#292D35] bg-[#0D0F13] p-3 sm:min-h-[620px] sm:p-4 lg:col-start-2 lg:row-start-1"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#828A96]">
                Preview stage
              </p>
              <h2
                id="preview-heading"
                className="mt-1 text-sm font-semibold text-[#E4E6EA]"
              >
                {activeTool === "depth" ? "3D preview" : "Result"}
              </h2>
            </div>
            {depthMap && (
              <span className="rounded-md border border-emerald-400/30 px-2.5 py-1 text-[10px] text-emerald-200">
                Relief ready
              </span>
            )}
          </div>
          <div className="mt-3 overflow-hidden rounded-md border border-[#292D35] bg-[#090B0F]">
            <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[#252932] px-2.5">
              <div role="tablist" aria-label="Preview source" className="inline-flex rounded bg-[#15181E] p-0.5">
                <button
                  type="button"
                  role="tab"
                  aria-selected={!showOriginalPreview}
                  onClick={() => setShowOriginalPreview(false)}
                  className={`rounded px-2.5 py-1 text-[10px] font-medium ${!showOriginalPreview ? "bg-[#252A33] text-[#E4E6EA]" : "text-[#8B929D] hover:text-white"}`}
                >
                  3D View
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={showOriginalPreview}
                  onClick={() => setShowOriginalPreview(true)}
                  className={`rounded px-2.5 py-1 text-[10px] font-medium ${showOriginalPreview ? "bg-[#252A33] text-[#E4E6EA]" : "text-[#8B929D] hover:text-white"}`}
                >
                  Original
                </button>
              </div>
              {activeTool === "depth" && depthMap && !showOriginalPreview && (
                <div role="tablist" aria-label="Relief render mode" className="flex items-center gap-0.5 rounded bg-[#15181E] p-0.5">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!showThreePreview}
                    onClick={() => setShowThreePreview(false)}
                    className={`rounded px-2 py-1 text-[10px] ${!showThreePreview ? "bg-[#252A33] text-[#E4E6EA]" : "text-[#8B929D] hover:text-white"}`}
                  >
                    Tilt
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={showThreePreview}
                    onClick={() => setShowThreePreview(true)}
                    className={`rounded px-2 py-1 text-[10px] ${showThreePreview ? "bg-[#252A33] text-[#E4E6EA]" : "text-[#8B929D] hover:text-white"}`}
                  >
                    3D
                  </button>
                </div>
              )}
              {selectedFile && sourceImageData && (
                <span className="hidden truncate text-[9px] text-[#747C88] sm:block">
                  {sourceImageData.width} × {sourceImageData.height} · {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
            </div>
            <div className={`relative grid h-[320px] touch-none place-items-center overflow-hidden sm:h-[min(58vh,520px)] sm:min-h-[360px] ${activeTool === "background" && backgroundMode === "transparent" ? "bg-[linear-gradient(45deg,#171A20_25%,transparent_25%),linear-gradient(-45deg,#171A20_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#171A20_75%),linear-gradient(-45deg,transparent_75%,#171A20_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]" : "bg-[#090B0F] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:40px_40px]"}`}>
                {showOriginalPreview && imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="Original uploaded image"
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-contain p-5"
                  />
                ) : activeTool === "background" && backgroundResult ? (
                  <>
                    {sourceImageData && (
                      <canvas
                        ref={beforeCompareCanvasRef}
                        aria-label="Before background removal"
                        className="absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)] object-contain"
                        style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
                      />
                    )}
                    <canvas
                      ref={backgroundCanvasRef}
                      aria-label="After background removal"
                      className="absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)] object-contain"
                      style={{ clipPath: `inset(0 0 0 ${comparePosition}%)` }}
                    />
                    <span
                      className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-[#FFB547]"
                      style={{ left: `${comparePosition}%` }}
                      aria-hidden="true"
                    />
                    <div className="absolute inset-x-0 bottom-0 z-20 bg-[#090B0F]/90 px-3 pb-2 pt-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={comparePosition}
                        onChange={(event) => setComparePosition(Number(event.currentTarget.value))}
                        aria-label="Compare before and after"
                        className="block h-4 w-full accent-[#FFB547]"
                      />
                      <div className="flex justify-between text-[10px] text-[#9D9484]">
                        <span>Before</span><span>After</span>
                      </div>
                    </div>
                  </>
                ) : activeTool === "depth" && depthMap && imageUrl ? (
                  showThreePreview ? (
                    <ModelViewer
                      depthMap={depthMap}
                      imageUrl={imageUrl}
                      depthStrength={reliefStrength / 75}
                      onReady={handleViewerReady}
                      onWebGLUnavailable={handleWebGLUnavailable}
                    />
                  ) : (
                    <canvas
                      ref={reliefCanvasRef}
                      onPointerMove={addDepthTilt}
                      onPointerLeave={resetDepthTilt}
                      aria-label="Depth relief preview. Move the pointer to tilt."
                      className="max-h-full max-w-full object-contain"
                      style={{ touchAction: "none" }}
                    />
                  )
                ) : imageUrl && activeTool === "depth" && !depthMap ? (
                  <Image
                    src={imageUrl}
                    alt="Source image ready for depth generation"
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-contain p-5 opacity-80"
                  />
                ) : (
                  <p className="max-w-xs px-4 text-center text-xs text-[#8B929D]">
                    {activeTool === "depth"
                      ? isGenerating
                        ? generationStage || "Generating depth relief..."
                        : "Your 3D preview will appear here. Upload an image to begin."
                      : isRemovingBackground
                        ? "Removing background..."
                        : "Upload an image to begin."}
                  </p>
                )}
              </div>
            </div>
          {depthMap && activeTool === "depth" && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#37321F] pt-4">
              <button
                type="button"
                onClick={() => void downloadReliefFrame()}
                className="rounded-[11px] bg-[#FFB547] px-4 py-2.5 text-sm font-semibold text-[#15130F] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]"
              >
                Download 3D frame
              </button>
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={isExporting}
                className="rounded-[11px] border border-[#37321F] px-4 py-2.5 text-sm font-semibold text-[#F3EDE2] hover:bg-[#25211A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547] disabled:cursor-wait disabled:opacity-60"
              >
                {isExporting ? "Preparing GLB..." : "Download GLB"}
              </button>
            </div>
          )}
        </section>

      </section>

      <div className="mx-auto mt-4 flex w-full max-w-[1600px] justify-end">
        <div className="rounded-md border border-[#34302A] bg-[#111318] px-3 py-2">
          <p className="text-[11px] font-semibold text-[#E4E6EA]">Need more credits?</p>
          <p className="mt-1 text-[10px] leading-4 text-[#9298A2]">Pick up a one-time credit pack.</p>
          <Link href="/billing" className="mt-2 inline-flex w-full justify-center rounded bg-[#FFB547] px-2 py-2 text-[10px] font-semibold text-[#15130F] hover:brightness-105">View plans</Link>
        </div>
      </div>

      <section aria-labelledby="session-results-heading" className="mt-5">
        <div className="mb-2 flex items-end justify-between border-b border-[#292D35] pb-2">
          <div>
            <h2 id="session-results-heading" className="text-sm font-semibold text-[#E4E6EA]">
              Recent creations
            </h2>
            <p className="mt-0.5 text-[10px] text-[#828A96]">Continue where you left off.</p>
          </div>
        </div>
        {sessionResults.length === 0 ? (
          <p className="py-3 text-[10px] text-[#828A96]">
            Your latest creations will appear here.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {sessionResults.map((result) => (
              <li key={result.id} className="min-w-0 overflow-hidden rounded-md border border-[#292D35] bg-[#111318]">
                <Image src={result.thumbnail} alt="" width={240} height={140} unoptimized className="aspect-[16/9] w-full object-cover" />
                <span className="block min-w-0 px-2 py-1.5">
                  <span className="block truncate text-[10px] font-medium text-[#D3D6DC]">{result.label}</span>
                  <time className="mt-0.5 block text-[9px] text-[#747C88]">{result.time}</time>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent-models-heading" className="mt-5">
        <div className="flex items-center justify-between gap-4 border-b border-[#292D35] pb-2">
          <div>
            <h2
              id="recent-models-heading"
              className="text-sm font-semibold text-[#E4E6EA]"
            >
              Saved depth reliefs
            </h2>
            <p className="mt-0.5 text-[10px] text-[#828A96]">
              Completed 3D assets from your account.
            </p>
          </div>
          <Link
            href="/gallery"
            className="text-[10px] font-medium text-[#FFB547] hover:text-[#FFD18A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFB547]"
          >
            View all
          </Link>
        </div>
        {recentGenerations === null ? (
          <p role="status" className="py-4 text-xs text-[#828A96]">
            Depth relief history is unavailable right now.
          </p>
        ) : recentGenerations.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-[#292D35] px-5 py-5 text-center">
            <p className="text-xs font-medium text-[#D3D6DC]">No depth reliefs yet</p>
            <p className="mt-1 text-[10px] text-[#828A96]">
              Successfully generated relief previews will appear here.
            </p>
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {recentGenerations.map((generation) => (
              <li
                key={generation.id}
                className="min-w-0 overflow-hidden rounded-md border border-[#292D35] bg-[#111318]"
              >
                <div className="relative aspect-[16/9] border-b border-[#292D35] bg-[#0B0D11]">
                  {generation.previewDataUrl ? (
                    <Image
                      src={generation.previewDataUrl}
                      alt={`Depth relief preview ${generation.id.slice(0, 8)}`}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, 25vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-[10px] text-[#747C88]">
                      Preview unavailable
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-[10px] font-medium text-[#D3D6DC]">
                    Depth relief {generation.id.slice(0, 8)}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-[9px] text-emerald-200">
                      {generation.source === "free" ? "Free" : "Credit"}
                    </span>
                    <time
                      dateTime={generation.completedAt}
                      className="text-[9px] text-[#747C88]"
                    >
                      {generation.completedAt.slice(0, 10)}
                    </time>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <StudioAssistant
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        position={assistantLauncherPosition}
      />
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-[12px] border border-[#37321F] bg-[#25211A] px-4 py-3 text-sm text-[#F3EDE2] shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
