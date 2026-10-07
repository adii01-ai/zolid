import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  generateVideo,
  getVideoServiceStatus,
  VideoResolutionNotSupportedError,
  VideoServiceNotConfiguredError,
} from "@/lib/video/service";
import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  VIDEO_MODES,
  VIDEO_RESOLUTIONS,
} from "@/types/video";

export const runtime = "nodejs";

const videoRequestSchema = z.object({
  mode: z.enum(VIDEO_MODES),
  prompt: z.string().max(200),
  aspectRatio: z.enum(VIDEO_ASPECT_RATIOS),
  duration: z
    .enum(["5", "10", "15"])
    .transform((value) => Number(value) as (typeof VIDEO_DURATIONS)[number]),
  resolution: z.enum(VIDEO_RESOLUTIONS),
});

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function getImageFormat(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

export async function GET() {
  return NextResponse.json({ ok: true, data: getVideoServiceStatus() });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return errorResponse(
      "UNAUTHENTICATED",
      "Please sign in to generate a video.",
      401,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      "INVALID_REQUEST",
      "The video request could not be read.",
      400,
    );
  }

  const parsed = videoRequestSchema.safeParse({
    mode: formString(formData, "mode"),
    prompt: formString(formData, "prompt") ?? "",
    aspectRatio: formString(formData, "aspectRatio"),
    duration: formString(formData, "duration"),
    resolution: formString(formData, "resolution"),
  });
  if (!parsed.success) {
    return errorResponse(
      "INVALID_REQUEST",
      "Choose valid video settings and try again.",
      400,
    );
  }

  const { mode, prompt, aspectRatio, duration, resolution } = parsed.data;
  if (mode === "text-to-video" && !prompt.trim()) {
    return errorResponse(
      "PROMPT_REQUIRED",
      "Enter a video prompt to continue.",
      400,
    );
  }

  let image: File | null = null;
  if (mode === "image-to-video") {
    const upload = formData.get("image");
    if (
      !(upload instanceof File) ||
      upload.size === 0 ||
      upload.size > 10 * 1024 * 1024
    ) {
      return errorResponse(
        "IMAGE_REQUIRED",
        "Choose an image that is 10 MB or smaller.",
        400,
      );
    }

    const bytes = new Uint8Array(await upload.arrayBuffer());
    const imageType = getImageFormat(bytes);
    if (!imageType) {
      return errorResponse(
        "INVALID_IMAGE",
        "Choose a valid JPG, PNG, or WebP image.",
        400,
      );
    }

    try {
      const { RawImage } = await import("@huggingface/transformers");
      const decoded = await RawImage.fromBlob(
        new Blob([bytes], { type: imageType }),
      );
      if (Math.min(decoded.width, decoded.height) < 256) {
        return errorResponse(
          "IMAGE_TOO_SMALL",
          "Image must be at least 256 pixels on each side.",
          400,
        );
      }
    } catch {
      return errorResponse(
        "INVALID_IMAGE",
        "The image could not be decoded. Choose another image.",
        400,
      );
    }
    image = upload;
  }

  try {
    const result = await generateVideo({
      mode,
      image,
      prompt: prompt.trim(),
      aspectRatio,
      duration,
      resolution,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof VideoServiceNotConfiguredError) {
      return errorResponse("VIDEO_SERVICE_NOT_CONFIGURED", error.message, 503);
    }
    if (error instanceof VideoResolutionNotSupportedError) {
      return errorResponse("UNSUPPORTED_RESOLUTION", error.message, 400);
    }
    console.error("[ZOLID] Video generation failed", error);
    return errorResponse(
      "VIDEO_GENERATION_FAILED",
      "Video generation failed. Please try again.",
      502,
    );
  }
}
