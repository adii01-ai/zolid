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
    <main className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:pl-[232px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#FFB547]">Zolid Studio</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#F3EDE2] sm:text-3xl">
            Create depth relief
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#9D9484] sm:text-sm">
            Turn your image into an interactive front-facing depth relief.
          </p>
        </div>
        <Link
          href="/gallery"
          className="text-xs font-medium text-[#FFB547] underline decoration-[#FFB547]/40 underline-offset-4 hover:text-[#FFD18A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFB547]"
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
