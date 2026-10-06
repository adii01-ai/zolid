import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeAuthRedirect } from "@/lib/auth/redirect";

function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing public Supabase environment variables.");
  }

  return { url, anonKey };
}

export async function middleware(request: NextRequest) {
  const { url, anonKey } = getPublicSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isProtectedPath = ["/studio", "/gallery", "/billing"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/signup";

  if ((!user && isProtectedPath) || (user && isAuthPage)) {
    const destination = user
      ? getSafeAuthRedirect(request.nextUrl.searchParams.get("next"))
      : `${pathname}${request.nextUrl.search}`;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = user ? destination : "/auth/login";
    redirectUrl.search = "";
    if (!user) redirectUrl.searchParams.set("next", destination);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};