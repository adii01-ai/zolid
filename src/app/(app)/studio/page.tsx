import Link from "next/link";
import StudioWorkspace, {
  type StudioGeneration,
} from "@/components/studio/StudioWorkspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function StudioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let credits: number | null = null;
  let allowanceConfigured = false;
  let recentGenerations: StudioGeneration[] | null = [];

  if (user) {
    const profileResult = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();

    const profileCredits = profileResult.data?.credits;
    if (typeof profileCredits === "number") credits = profileCredits;
    allowanceConfigured =
      !profileResult.error &&
      typeof profileCredits === "number";

    try {
      const admin = createSupabaseAdminClient();
      const generationResult = await admin
        .from("depth_generation_reservations")
        .select("id,source,completed_at,preview_data_url")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(4);
      recentGenerations = generationResult.error
        ? null
        : (generationResult.data ?? []).map((generation) => ({
            id: generation.id,
            source: generation.source as "free" | "purchased",
            completedAt: generation.completed_at ?? "",
            previewDataUrl: generation.preview_data_url,
          }));
    } catch {
      recentGenerations = null;
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-cyan-300">Zolid Studio</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Create depth relief
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Turn your image into an interactive front-facing depth relief.
          </p>
        </div>
        <Link
          href="/gallery"
          className="text-sm font-medium text-cyan-200 underline decoration-cyan-200/40 underline-offset-4 hover:text-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
        >
          View gallery
        </Link>
      </div>

      <StudioWorkspace
        credits={credits}
        allowanceConfigured={allowanceConfigured}
        recentGenerations={recentGenerations}
      />
    </main>
  );
}
