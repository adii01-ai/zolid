import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({ reservationId: z.string().uuid() });

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

  const { error } = await supabase.rpc("cancel_depth_generation", {
    p_reservation_id: payload.data.reservationId,
  });
  if (error) {
    return NextResponse.json(
      { error: "The generation could not be cancelled." },
      { status: 409 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
