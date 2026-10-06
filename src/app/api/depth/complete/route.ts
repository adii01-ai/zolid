import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  reservationId: z.string().uuid(),
  previewDataUrl: z
    .string()
    .max(180_000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to continue." },
      { status: 401 },
    );
  }

  const payload = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!payload.success) {
    const previewTooLarge = payload.error.issues.some(
      (issue) =>
        issue.path[0] === "previewDataUrl" && issue.code === "too_big",
    );
    return NextResponse.json(
      {
        code: previewTooLarge ? "PREVIEW_TOO_LARGE" : "INVALID_RESERVATION",
        error: previewTooLarge
          ? "The relief preview was too large to save. Please generate again."
          : "Invalid generation reservation.",
      },
      { status: previewTooLarge ? 413 : 400 },
    );
  }

  const { data, error } = await supabase.rpc("complete_depth_generation", {
    p_reservation_id: payload.data.reservationId,
    p_preview_data_url: payload.data.previewDataUrl,
  });
  if (error || !Array.isArray(data) || !data[0]) {
    if (error) {
      console.error("[ZOLID] Could not complete depth reservation", {
        code: error.code,
        message: error.message,
      });
    } else {
      console.error("[ZOLID] Depth completion RPC returned no account balance.");
    }
    return NextResponse.json(
      {
        code: "CREDIT_COMPLETION_FAILED",
        error:
          "The generation could not be recorded, so no credits were charged. Please retry.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    freeGenerationsUsed: data[0].free_generations_used,
    freeGenerationsLimit: data[0].free_generations_limit,
    purchasedCredits: data[0].purchased_credits,
  });
}
