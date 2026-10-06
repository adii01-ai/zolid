import { NextResponse, type NextRequest } from "next/server";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl;
  const appOrigin = process.env.RENDER_EXTERNAL_HOSTNAME
    ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
    : request.nextUrl.origin;
  const code = callbackUrl.searchParams.get("code");
  const tokenHash = callbackUrl.searchParams.get("token_hash");
  const type = callbackUrl.searchParams.get("type");
  const flow = callbackUrl.searchParams.get("flow");
  const nextPath = type === "recovery"
    ? "/auth/update-password"
    : getSafeAuthRedirect(callbackUrl.searchParams.get("next"));

  if (tokenHash && type) {
    const confirmUrl = new URL("/auth/confirm", appOrigin);
    confirmUrl.searchParams.set("token_hash", tokenHash);
    confirmUrl.searchParams.set("type", type);
    confirmUrl.searchParams.set("next", nextPath);
    if (flow) confirmUrl.searchParams.set("flow", flow);
    return NextResponse.redirect(confirmUrl);
  }

  if (!code) {
    const loginUrl = new URL("/auth/login", appOrigin);
    loginUrl.searchParams.set("error", "callback");
    loginUrl.searchParams.set("next", nextPath);
    if (type === "recovery") loginUrl.searchParams.set("recovery", "1");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/auth/login", appOrigin);
    loginUrl.searchParams.set("error", "callback");
    loginUrl.searchParams.set("next", nextPath);
    if (type === "recovery") loginUrl.searchParams.set("recovery", "1");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(nextPath, appOrigin));
}