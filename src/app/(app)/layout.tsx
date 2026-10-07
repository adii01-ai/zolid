import type { ReactNode } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let credits: number | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();
    if (typeof profile?.credits === "number") credits = profile.credits;
  }

  return (
    <>
        <SiteHeader
          isAuthenticated={Boolean(user)}
          userEmail={user?.email ?? null}
          credits={credits}
        />
      {children}
    </>
  );
}
