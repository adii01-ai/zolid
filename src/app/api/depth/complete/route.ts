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
    return NextResponse.json(
      { error: "Invalid generation reservation." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("complete_depth_generation", {
    p_reservation_id: payload.data.reservationId,
    p_preview_data_url: payload.data.previewDataUrl,
  });
  if (error || !Array.isArray(data) || !data[0]) {
    if (process.env.NODE_ENV === "development" && error) {
      console.error("[ZOLID] Could not complete depth reservation", {
        code: error.code,
        message: error.message,
      });
    }
    return NextResponse.json(
      {
        error:
          "The generation could not be recorded. Your allowance was not changed.",
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
