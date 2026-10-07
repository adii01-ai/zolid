"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { validateImageFile } from "@/lib/validation/image";
import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoMode,
  type VideoResolution,
} from "@/types/video";

type VideoGenerationPanelProps = {
  onVideoChange: (videoUrl: string | null) => void;
  onSourceImageChange: (file: File | null) => void;
  onGeneratingChange: (isGenerating: boolean) => void;
};

type ServiceStatus = {
  configured: boolean;
  supportedResolutions: VideoResolution[];
};

type ApiResponse = {
  ok: boolean;
  data?: { videoUrl?: string } & Partial<ServiceStatus>;
  error?: { message: string };
};

const optionClass = (selected: boolean) =>
  `min-h-7 rounded border px-1 text-[9px] transition-colors ${selected ? "border-[#FFB547] bg-[#FFB547]/10 text-[#FFB547]" : "border-[#343944] bg-[#0D0F13] text-[#A9AFBA] hover:border-[#68604F] hover:text-[#F3EDE2]"}`;

export default function VideoGenerationPanel({
  onVideoChange,
  onSourceImageChange,
  onGeneratingChange,
}: VideoGenerationPanelProps) {
  const [mode, setMode] = useState<VideoMode>("image-to-video");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("16:9");
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCheckingImage, setIsCheckingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(
    null,
  );
  const imageInput = useRef<HTMLInputElement | null>(null);
  const validationRun = useRef(0);

  useEffect(() => {
    let active = true;
    void fetch("/api/generate-video")
      .then(async (response) => {
        const result = (await response
          .json()
          .catch(() => null)) as ApiResponse | null;
        if (!response.ok || !result?.ok || !result.data) {
          throw new Error("Video service settings could not be loaded.");
        }
        if (active) {
          setServiceStatus({
            configured: result.data.configured === true,
            supportedResolutions: result.data.supportedResolutions ?? [],
          });
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Video service settings could not be loaded. Try refreshing.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!image) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function selectImage(file: File | undefined) {
    if (!file) return;
    const run = ++validationRun.current;
    setIsCheckingImage(true);
    setImageError(null);
    const result = await validateImageFile(file);
    if (run !== validationRun.current) return;
    setIsCheckingImage(false);
    if (!result.valid) {
      setImageError(result.error);
      return;
    }
    setImage(file);
    setError(null);
    onSourceImageChange(file);
    onVideoChange(null);
  }

  function clearImage() {
    validationRun.current += 1;
    setImage(null);
    setImageError(null);
    setIsCheckingImage(false);
    onSourceImageChange(null);
    onVideoChange(null);
    if (imageInput.current) imageInput.current.value = "";
  }

  function changeMode(nextMode: VideoMode) {
    setMode(nextMode);
    setPrompt("");
    setError(null);
    onVideoChange(null);
  }

  async function handleGenerate() {
    if (isGenerating || (mode === "image-to-video" ? !image : !prompt.trim()))
      return;

    const formData = new FormData();
    formData.set("mode", mode);
    formData.set("prompt", prompt.trim());
    formData.set("aspectRatio", aspectRatio);
    formData.set("duration", String(duration));
    formData.set("resolution", resolution);
    if (mode === "image-to-video" && image) formData.set("image", image);

    setIsGenerating(true);
    setError(null);
    onVideoChange(null);
    onGeneratingChange(true);
    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        body: formData,
      });
      const result = (await response
        .json()
        .catch(() => null)) as ApiResponse | null;
      if (!response.ok || !result?.ok || !result.data?.videoUrl) {
        throw new Error(
          result?.error?.message ??
            "Video generation failed. Please try again.",
        );
      }
      const videoUrl = new URL(result.data.videoUrl);
      if (videoUrl.protocol !== "https:")
        throw new Error("The video service returned an invalid video URL.");
      onVideoChange(videoUrl.toString());
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Video generation failed. Please try again.",
      );
    } finally {
      setIsGenerating(false);
      onGeneratingChange(false);
    }
  }

  const canGenerate =
    mode === "image-to-video" ? image !== null : prompt.trim().length > 0;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FFB547]">
          Video generation
        </p>
        <p className="mt-1 text-[9px] leading-4 text-[#8B929D]">
          Create a video from an image or a text prompt.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[10px] font-semibold text-[#D3D6DC]">
          1. Choose Mode
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {(["image-to-video", "text-to-video"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={mode === item}
              onClick={() => changeMode(item)}
              className={`min-h-8 rounded-md border px-1.5 text-[9px] font-semibold transition-colors ${mode === item ? "border-[#FFB547] bg-[#FFB547] text-[#15130F]" : "border-[#343944] bg-[#0D0F13] text-[#A9AFBA] hover:text-[#F3EDE2]"}`}
            >
              {item === "image-to-video" ? "Image to Video" : "Text to Video"}
            </button>
          ))}
        </div>
      </fieldset>

      {mode === "image-to-video" && (
        <section aria-labelledby="video-source-heading">
          <h3
            id="video-source-heading"
            className="mb-1.5 text-[10px] font-semibold text-[#D3D6DC]"
          >
            2. Source Image
          </h3>
          <input
            ref={imageInput}
            id="video-source-image"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              void selectImage(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void selectImage(event.dataTransfer.files[0]);
            }}
            className="rounded-md border border-[#343944] bg-[#0D0F13] p-2"
          >
            {image && imagePreviewUrl && (
              <div className="mb-2 flex min-w-0 items-center gap-2 border-b border-[#292D35] pb-2">
                <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded border border-[#343944] bg-[#080A0D]">
                  <Image
                    src={imagePreviewUrl}
                    alt={`Preview of ${image.name}`}
                    fill
                    unoptimized
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[9px] font-medium text-[#D3D6DC]">
                    {image.name}
                  </p>
                  <p className="text-[8px] text-[#828A96]">
                    {(image.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearImage}
                  className="shrink-0 rounded border border-[#343944] px-1.5 py-1 text-[8px] text-[#A9AFBA] hover:text-white"
                >
                  Remove
                </button>
              </div>
            )}
            <label
              htmlFor="video-source-image"
              className="flex min-h-11 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-[#454B52] px-2 py-1 text-center hover:border-[#FFB547]"
            >
              <span className="text-[9px] text-[#D3D6DC]">
                {isCheckingImage
                  ? "Checking image…"
                  : image
                    ? "Drop to replace or browse"
                    : "Drop image here or browse"}
              </span>
              <span className="mt-0.5 text-[8px] text-[#828A96]">
                JPG, PNG, or WebP · up to 10 MB
              </span>
            </label>
          </div>
          {imageError && (
            <p role="alert" className="mt-1 text-[9px] text-rose-300">
              {imageError}
            </p>
          )}
        </section>
      )}

      <fieldset>
        <legend className="mb-1.5 text-[10px] font-semibold text-[#D3D6DC]">
          3. Aspect Ratio
        </legend>
        <div className="grid grid-cols-4 gap-1">
          {VIDEO_ASPECT_RATIOS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={aspectRatio === item}
              onClick={() => setAspectRatio(item)}
              className={optionClass(aspectRatio === item)}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-[10px] font-semibold text-[#D3D6DC]">
          4. Duration
        </legend>
        <div className="grid grid-cols-3 gap-1">
          {VIDEO_DURATIONS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={duration === item}
              onClick={() => setDuration(item)}
              className={optionClass(duration === item)}
            >
              {item}s
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-[10px] font-semibold text-[#D3D6DC]">
          5. Resolution
        </legend>
        <div className="grid grid-cols-3 gap-1">
          {VIDEO_RESOLUTIONS.map((item) => {
            const supported =
              serviceStatus?.supportedResolutions.includes(item) ?? false;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={resolution === item}
                disabled={!supported || isGenerating}
                title={
                  supported
                    ? item
                    : "Unavailable until a compatible video service is configured."
                }
                onClick={() => setResolution(item)}
                className={`${optionClass(resolution === item)} disabled:cursor-not-allowed disabled:opacity-35`}
              >
                {item}
              </button>
            );
          })}
        </div>
        {serviceStatus && !serviceStatus.configured && (
          <p role="status" className="mt-1 text-[8px] leading-3 text-[#828A96]">
            Resolutions are unavailable until a video provider is configured.
          </p>
        )}
      </fieldset>

      <div>
        <label
          htmlFor="video-generation-prompt"
          className="mb-1.5 block text-[10px] font-semibold text-[#D3D6DC]"
        >
          {mode === "image-to-video" ? "Motion Prompt" : "Video Prompt"}{" "}
          <span className="font-normal text-[#828A96]">
            {mode === "image-to-video" ? "(Optional)" : "(Required)"}
          </span>
        </label>
        <textarea
          id="video-generation-prompt"
          value={prompt}
          maxLength={200}
          rows={2}
          onChange={(event) => setPrompt(event.currentTarget.value)}
          placeholder={
            mode === "image-to-video"
              ? "Describe the movement or camera motion..."
              : "Describe the video you want to generate..."
          }
          className="min-h-[58px] w-full resize-y rounded-md border border-[#343944] bg-[#0D0F13] px-2.5 py-2 text-[9px] leading-4 text-[#E4E6EA] placeholder:text-[#747C88] focus:border-[#FFB547] focus:outline-none"
        />
        {mode === "image-to-video" && (
          <p className="mt-1 text-[8px] leading-3 text-[#747C88]">
            Example: Slow cinematic camera push-in, subtle subject movement,
            realistic lighting.
          </p>
        )}
        <p className="mt-1 text-right text-[8px] text-[#747C88]">
          {prompt.length}/200
        </p>
      </div>

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={!canGenerate || isGenerating || isCheckingImage}
        className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[#FFB547] px-3 py-2 text-[10px] font-semibold text-[#15130F] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">▶</span>
        {isGenerating ? "Generating…" : "Generate Video"}
      </button>

      {isGenerating && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-[#343944] bg-[#0D0F13] p-2.5"
        >
          <div className="flex items-center gap-2">
            <span
              className="size-4 animate-spin rounded-full border-2 border-[#49443A] border-t-[#FFB547]"
              aria-hidden="true"
            />
            <div>
              <p className="text-[10px] font-semibold text-[#E4E6EA]">
                Generating video...
              </p>
              <p className="mt-0.5 text-[9px] text-[#8B929D]">
                Please wait while your video is being created.
              </p>
            </div>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded bg-[#252932]">
            <div className="h-full w-1/2 animate-pulse rounded bg-[#FFB547]/70" />
          </div>
        </div>
      )}
      {serviceStatus && !serviceStatus.configured && !error && (
        <p role="status" className="text-[9px] leading-4 text-[#D5B875]">
          Video generation service is not configured.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded border border-rose-400/20 bg-rose-400/5 px-2 py-1.5 text-[9px] leading-4 text-rose-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
