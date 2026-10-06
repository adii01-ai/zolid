import { NextResponse, type NextRequest } from "next/server";
import { getCreditBundle } from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in before buying credits." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { bundleId?: string } | null;
  const bundle = body?.bundleId ? getCreditBundle(body.bundleId) : null;
  if (!bundle) {
    return NextResponse.json({ error: "Choose a valid credit bundle." }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: "inr",
            unit_amount: bundle.amountInPaise,
            product_data: {
              name: `Zolid ${bundle.name} credit bundle`,
              description: `${bundle.credits} credits. Credits do not expire.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        bundle_id: bundle.id,
        credits: String(bundle.credits),
      },
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[ZOLID] Stripe checkout creation failed", error);
    return NextResponse.json(
      { error: "Checkout is unavailable. Check the Stripe server configuration and try again." },
      { status: 503 },
    );
  }
}
