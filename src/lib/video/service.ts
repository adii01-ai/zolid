import "server-only";

import type {
  VideoGenerationInput,
  VideoGenerationResult,
  VideoResolution,
} from "@/types/video";

export type VideoProviderAdapter = {
  supportedResolutions: readonly VideoResolution[];
  quoteCredits(input: {
    duration: VideoGenerationInput["duration"];
    resolution: VideoResolution;
    providerCost: number;
  }): number;
  generateVideo(input: VideoGenerationInput): Promise<VideoGenerationResult>;
};

export class VideoServiceNotConfiguredError extends Error {
  constructor() {
    super("Video generation service is not configured.");
    this.name = "VideoServiceNotConfiguredError";
  }
}

export class VideoResolutionNotSupportedError extends Error {
  constructor() {
    super(
      "The selected resolution is not supported by the configured video service.",
    );
    this.name = "VideoResolutionNotSupportedError";
  }
}

export function getVideoProvider(): VideoProviderAdapter | null {
  return null;
}

export function getVideoServiceStatus() {
  const provider = getVideoProvider();
  return {
    configured: provider !== null,
    supportedResolutions: provider?.supportedResolutions ?? [],
  };
}

export async function generateVideo(
  input: VideoGenerationInput,
): Promise<VideoGenerationResult> {
  const provider = getVideoProvider();
  if (!provider) throw new VideoServiceNotConfiguredError();
  if (!provider.supportedResolutions.includes(input.resolution)) {
    throw new VideoResolutionNotSupportedError();
  }

  const result = await provider.generateVideo(input);
  const videoUrl = new URL(result.videoUrl);
  if (videoUrl.protocol !== "https:") {
    throw new Error("The video service returned an unsafe video URL.");
  }
  return { videoUrl: videoUrl.toString() };
}
