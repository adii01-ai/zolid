export const VIDEO_MODES = ["image-to-video", "text-to-video"] as const;
export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5"] as const;
export const VIDEO_DURATIONS = [5, 10, 15] as const;
export const VIDEO_RESOLUTIONS = ["480p", "720p", "1080p"] as const;

export type VideoMode = (typeof VIDEO_MODES)[number];
export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIOS)[number];
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

export type VideoGenerationInput = {
  mode: VideoMode;
  image: File | null;
  prompt: string;
  aspectRatio: VideoAspectRatio;
  duration: VideoDuration;
  resolution: VideoResolution;
};

export type VideoGenerationResult = {
  videoUrl: string;
};
