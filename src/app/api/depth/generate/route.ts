import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CREDIT_COSTS } from "@/lib/billing/plans";

export const runtime = "nodejs";

function getImageFormat(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function cancelReservation(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  reservationId: string,
) {
  await supabase.rpc("cancel_depth_generation", {
    p_reservation_id: reservationId,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: "Please sign in to generate a depth relief." },
      { status: 401 },
    );
  }

  let reservationId: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Choose an image that is 10 MB or smaller." },
        { status: 400 },
      );
    }

    const imageBytes = new Uint8Array(await file.arrayBuffer());
    const imageType = getImageFormat(imageBytes);
    if (!imageType) {
      return NextResponse.json(
        { error: "Choose a valid JPG, PNG, or WebP image." },
        { status: 400 },
      );
    }

    const { RawImage } = await import("@huggingface/transformers");
    const imageBlob = new Blob([imageBytes], { type: imageType });
    const image = await RawImage.fromBlob(imageBlob);
    if (Math.min(image.width, image.height) < 256) {
      return NextResponse.json(
        { error: "Image must be at least 256 pixels on each side." },
        { status: 400 },
      );
    }

    const reservation = await supabase.rpc("reserve_depth_generation");
    if (reservation.error || typeof reservation.data !== "string") {
      const insufficientCredits = reservation.error?.message.includes("insufficient_credits");
      const inProgress = reservation.error?.message.includes(
        "generation_in_progress",
      );
      const balanceResult = insufficientCredits
        ? await supabase.from("profiles").select("credits").eq("id", user.id).maybeSingle()
        : null;
      return NextResponse.json(
        {
          error: insufficientCredits
            ? `A depth relief costs ${CREDIT_COSTS.depthRelief} credits.`
            : inProgress
              ? "A generation is already reserving credits. Please try again shortly."
              : "Your generation allowance is unavailable. Please try again.",
          code: insufficientCredits
            ? "INSUFFICIENT_CREDITS"
            : inProgress
              ? "GENERATION_IN_PROGRESS"
              : "ALLOWANCE_UNAVAILABLE",
          credits: balanceResult?.data?.credits,
        },
        { status: insufficientCredits ? 402 : inProgress ? 409 : 503 },
      );
    }
    reservationId = reservation.data;
    return NextResponse.json({ reservationId });
  } catch (error) {
    if (reservationId) await cancelReservation(supabase, reservationId);
    const message =
      error instanceof Error ? error.message : "Depth generation failed.";
    if (process.env.NODE_ENV === "development") {
      console.error("[ZOLID] Depth relief generation failed", error);
    }
    return NextResponse.json(
      { error: `Depth relief could not be generated. ${message}` },
      { status: 500 },
    );
  }
}
