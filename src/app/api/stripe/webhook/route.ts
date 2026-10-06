import { NextResponse, type NextRequest } from "next/server";
import { getCreditBundle } from "@/lib/billing/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 400 });
  }

  let event;
  try {
    const payload = await request.text();
    event = getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("[ZOLID] Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  if (session.mode !== "payment" || session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const userId = session.metadata?.user_id;
  const bundleId = session.metadata?.bundle_id;
  const bundle = bundleId ? getCreditBundle(bundleId) : null;
  const metadataCredits = Number(session.metadata?.credits);
  if (
    !userId ||
    userId !== session.client_reference_id ||
    !bundle ||
    metadataCredits !== bundle.credits ||
    session.currency !== "inr" ||
    session.amount_total !== bundle.amountInPaise
  ) {
    console.error("[ZOLID] Paid Stripe session did not match a configured credit bundle", session.id);
    return NextResponse.json({ error: "Invalid credit bundle metadata." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("grant_stripe_credit_bundle", {
    p_user_id: userId,
    p_credits: bundle.credits,
    p_event_id: event.id,
  });
  if (error) {
    console.error("[ZOLID] Could not grant Stripe credits", error);
    return NextResponse.json({ error: "Credit grant failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
